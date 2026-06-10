/**
 * Portal do Médico — API (Google Apps Script Web App)
 *
 * Este script fica VINCULADO à planilha "configuracoes" do ClinicaApp,
 * na conta Google da cliente (Alyne). Publicado como App da Web:
 *   - Executar como: EU (a dona da planilha)
 *   - Quem pode acessar: QUALQUER PESSOA
 *
 * O medico.html (GitHub Pages) chama esta URL via fetch. O token do
 * médico (coluna H da aba Medicos) é o único autenticador.
 *
 * Roteiro de publicação: ver docs/setup-portal-medico.md
 */

const ABAS = {
  medicos: 'Medicos',
  escala: 'Escala',
  clinicas: 'Clinicas',
  salas: 'Salas',
  solicitacoes: 'Solicitacoes'
};

const HEADER_SOLICITACOES = [
  'id', 'medico_solicitante_id', 'medico_destino_id',
  'sala_id_origem', 'data_origem', 'turno_origem',
  'sala_id_destino', 'data_destino', 'turno_destino',
  'status', 'data_criacao', 'data_resposta'
];

// ══════════════════════════════════════════════════════
// Entradas HTTP
// ══════════════════════════════════════════════════════

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.acao === 'ping') return json_({ ok: true, pong: true });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const eu = medicoPorToken_(ss, p.token);
    if (!eu) return json_({ ok: false, erro: 'token_invalido' });

    if (p.acao === 'dados') return json_(dados_(ss, eu, Number(p.ano), Number(p.mes)));
    return json_({ ok: false, erro: 'acao_desconhecida' });
  } catch (err) {
    return json_({ ok: false, erro: 'interno', detalhe: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const eu = medicoPorToken_(ss, body.token);
    if (!eu) return json_({ ok: false, erro: 'token_invalido' });

    if (body.acao === 'propor') return json_(propor_(ss, eu, body));
    if (body.acao === 'responder') return json_(responder_(ss, eu, body));
    return json_({ ok: false, erro: 'acao_desconhecida' });
  } catch (err) {
    return json_({ ok: false, erro: 'interno', detalhe: String(err) });
  }
}

// ══════════════════════════════════════════════════════
// Ações
// ══════════════════════════════════════════════════════

function dados_(ss, eu, ano, mes) {
  const prefixo = (ano && mes) ? ano + '-' + ('0' + mes).slice(-2) : '';

  // Nunca expor token/email/crm dos outros médicos
  const medicos = lerAba_(ss, ABAS.medicos)
    .filter(m => ativo_(m))
    .map(m => ({ id: m.id, nome: m.nome, cor: m.cor_agenda || '#1a73e8' }));

  const clinicas = lerAba_(ss, ABAS.clinicas)
    .filter(c => ativo_(c))
    .map(c => ({ id: c.id, nome: c.nome }));

  const salas = lerAba_(ss, ABAS.salas)
    .filter(s => ativo_(s))
    .map(s => ({ id: s.id, clinica_id: s.clinica_id, nome: s.nome }));

  const escala = lerAba_(ss, ABAS.escala)
    .filter(e => e.medico_id && (!prefixo || String(e.data).indexOf(prefixo) === 0))
    .map(e => ({ sala_id: e.sala_id, medico_id: e.medico_id, data: e.data, turno: e.turno }));

  garantirAbaSolicitacoes_(ss);
  const solicitacoes = lerAba_(ss, ABAS.solicitacoes)
    .filter(s => s.medico_solicitante_id === eu.id || s.medico_destino_id === eu.id)
    .map(s => ({
      id: s.id,
      medico_solicitante_id: s.medico_solicitante_id,
      medico_destino_id: s.medico_destino_id,
      sala_id_origem: s.sala_id_origem, data_origem: s.data_origem, turno_origem: s.turno_origem,
      sala_id_destino: s.sala_id_destino, data_destino: s.data_destino, turno_destino: s.turno_destino,
      status: s.status, data_criacao: s.data_criacao
    }));

  return {
    ok: true,
    medico: { id: eu.id, nome: eu.nome, cor: eu.cor_agenda || '#1a73e8' },
    medicos: medicos, clinicas: clinicas, salas: salas,
    escala: escala, solicitacoes: solicitacoes
  };
}

function propor_(ss, eu, b) {
  const o = b.origem || {}, d = b.destino || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const escala = lerAba_(ss, ABAS.escala);

    const eo = acharTurno_(escala, o);
    if (!eo || eo.medico_id !== eu.id) return { ok: false, erro: 'origem_invalida' };

    const ed = acharTurno_(escala, d);
    if (!ed || !ed.medico_id || ed.medico_id === eu.id) return { ok: false, erro: 'destino_invalido' };

    const sh = garantirAbaSolicitacoes_(ss);
    const dup = lerAba_(ss, ABAS.solicitacoes).find(s =>
      s.status === 'pendente' && s.medico_solicitante_id === eu.id &&
      s.sala_id_origem === o.sala_id && s.data_origem === o.data && s.turno_origem === o.turno &&
      s.sala_id_destino === d.sala_id && s.data_destino === d.data && s.turno_destino === d.turno
    );
    if (dup) return { ok: false, erro: 'proposta_duplicada' };

    const id = 'sol_' + Utilities.formatDate(new Date(), tz_(), 'yyyyMMdd') + '_' +
               Math.random().toString(36).slice(2, 6);
    const row = [id, eu.id, ed.medico_id,
                 o.sala_id, o.data, o.turno,
                 d.sala_id, d.data, d.turno,
                 'pendente', new Date().toISOString(), ''];

    // setNumberFormat('@') antes de gravar: impede o Sheets de converter "2026-06-15" em Date
    const range = sh.getRange(sh.getLastRow() + 1, 1, 1, row.length);
    range.setNumberFormat('@');
    range.setValues([row]);

    return { ok: true, id: id };
  } finally {
    lock.releaseLock();
  }
}

function responder_(ss, eu, b) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = garantirAbaSolicitacoes_(ss);
    const s = lerAba_(ss, ABAS.solicitacoes).find(x => x.id === b.id);
    if (!s) return { ok: false, erro: 'nao_encontrada' };
    if (s.medico_destino_id !== eu.id) return { ok: false, erro: 'sem_permissao' };
    if (s.status !== 'pendente') return { ok: false, erro: 'ja_respondida' };

    const colStatus = HEADER_SOLICITACOES.indexOf('status') + 1;
    const colResposta = HEADER_SOLICITACOES.indexOf('data_resposta') + 1;

    if (b.resposta === 'recusado') {
      sh.getRange(s._linha, colStatus).setValue('recusado');
      sh.getRange(s._linha, colResposta).setValue(new Date().toISOString());
      return { ok: true, status: 'recusado' };
    }
    if (b.resposta !== 'aceito') return { ok: false, erro: 'resposta_invalida' };

    // A escala pode ter mudado desde a proposta — revalida os dois turnos
    const escala = lerAba_(ss, ABAS.escala);
    const eo = acharTurno_(escala, { sala_id: s.sala_id_origem, data: s.data_origem, turno: s.turno_origem });
    const ed = acharTurno_(escala, { sala_id: s.sala_id_destino, data: s.data_destino, turno: s.turno_destino });

    if (!eo || eo.medico_id !== s.medico_solicitante_id || !ed || ed.medico_id !== eu.id) {
      sh.getRange(s._linha, colStatus).setValue('expirada');
      sh.getRange(s._linha, colResposta).setValue(new Date().toISOString());
      return { ok: false, erro: 'escala_mudou' };
    }

    // Swap dos dois turnos na aba Escala
    const shEscala = ss.getSheetByName(ABAS.escala);
    const colMedico = colunaDe_(shEscala, 'medico_id');
    shEscala.getRange(eo._linha, colMedico).setValue(ed.medico_id);
    shEscala.getRange(ed._linha, colMedico).setValue(eo.medico_id);

    sh.getRange(s._linha, colStatus).setValue('aceito');
    sh.getRange(s._linha, colResposta).setValue(new Date().toISOString());

    notificarAdmin_(ss, s, eu);
    return { ok: true, status: 'aceito' };
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════════
// Notificação por email (Alyne = dona da planilha)
// ══════════════════════════════════════════════════════

function notificarAdmin_(ss, s, respondente) {
  try {
    const medicos = lerAba_(ss, ABAS.medicos);
    const salas = lerAba_(ss, ABAS.salas);
    const nomeMed = id => { const m = medicos.find(x => x.id === id); return m ? m.nome : id; };
    const nomeSala = id => { const x = salas.find(y => y.id === id); return x ? x.nome : id; };
    const TURNOS = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };

    const solicitante = nomeMed(s.medico_solicitante_id);
    const corpo =
      'Uma troca de turno foi confirmada entre os médicos:\n\n' +
      '• ' + solicitante + ' assume: ' + dataBR_(s.data_destino) + ' — ' +
      (TURNOS[s.turno_destino] || s.turno_destino) + ' — sala ' + nomeSala(s.sala_id_destino) + '\n' +
      '• ' + respondente.nome + ' assume: ' + dataBR_(s.data_origem) + ' — ' +
      (TURNOS[s.turno_origem] || s.turno_origem) + ' — sala ' + nomeSala(s.sala_id_origem) + '\n\n' +
      'A escala já foi atualizada automaticamente no sistema.\n\n' +
      '— ClinicaApp (mensagem automática)';

    MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
      '[ClinicaApp] Troca de turno confirmada: ' + solicitante + ' ↔ ' + respondente.nome,
      corpo);
  } catch (err) {
    // Email é cortesia — falha no envio não pode desfazer a troca
    console.error('Falha ao notificar admin: ' + err);
  }
}

// ══════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function tz_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
}

function ativo_(o) {
  return String(o.ativo).toUpperCase() === 'TRUE';
}

function dataBR_(iso) {
  const p = String(iso).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso);
}

// Lê uma aba inteira como objetos { nomeColuna: valor }, usando a linha 1 como chaves.
// Datas viram string 'yyyy-MM-dd' (o Sheets converte texto em Date ao gravar; aqui normalizamos de volta).
function lerAba_(ss, nome) {
  const sh = ss.getSheetByName(nome);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0].map(h => String(h).trim());
  return values.slice(1).map((row, i) => {
    const o = { _linha: i + 2 };
    header.forEach((h, c) => {
      if (!h) return;
      const v = row[c];
      o[h] = (v instanceof Date) ? Utilities.formatDate(v, tz_(), 'yyyy-MM-dd') : String(v);
    });
    return o;
  }).filter(o => o.id);
}

function medicoPorToken_(ss, token) {
  if (!token) return null;
  return lerAba_(ss, ABAS.medicos)
    .find(m => m.token === String(token) && ativo_(m)) || null;
}

function acharTurno_(escala, t) {
  return escala.find(e =>
    e.sala_id === t.sala_id && e.data === t.data && e.turno === t.turno
  ) || null;
}

function colunaDe_(sh, nomeColuna) {
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return header.map(h => String(h).trim()).indexOf(nomeColuna) + 1;
}

function garantirAbaSolicitacoes_(ss) {
  let sh = ss.getSheetByName(ABAS.solicitacoes);
  if (!sh) {
    sh = ss.insertSheet(ABAS.solicitacoes);
    sh.getRange(1, 1, 1, HEADER_SOLICITACOES.length).setValues([HEADER_SOLICITACOES]);
  }
  return sh;
}
