const Setup = {
    PLANILHAS: {
        pacientes: {
            nome: 'pacientes',
            abas: [{
                nome: 'Pacientes',
                cabecalhos: ['id','nome_completo','data_nascimento','cpf','telefone','email','convenio','numero_convenio','medico_responsavel','observacoes_gerais','data_cadastro','ativo']
            }]
        },
        consultas: {
            nome: 'consultas',
            abas: [{
                nome: 'Consultas',
                cabecalhos: ['id','paciente_id','medico','data_hora','duracao_min','status','tipo','anotacoes','valor','forma_pagamento','status_pagamento','calendar_event_id','data_registro']
            }]
        },
        financeiro: {
            nome: 'financeiro',
            abas: [{
                nome: 'Financeiro',
                cabecalhos: ['id','consulta_id','paciente_id','medico','data','valor','forma_pagamento','status','data_pagamento','observacao']
            }]
        },
        configuracoes: {
            nome: 'configuracoes',
            abas: [
                { nome: 'Geral',    cabecalhos: ['chave','valor'] },
                { nome: 'Medicos',  cabecalhos: ['id','nome','especialidade','crm','cor_agenda','ativo'] },
                { nome: 'Escala',   cabecalhos: ['id','medico_id','data','turno','observacao','data_registro'] }
            ]
        }
    },

    progresso(msg, pct) {
        document.getElementById('progresso-msg').textContent = msg;
        document.getElementById('progresso-barra').style.width = pct + '%';
    },

    async executar(token) {
        // Se já existe a pasta raiz, setup já foi feito — ir direto para o app
        const existentes = await DriveService.listarPastas(token, 'ClinicaApp');
        if (existentes.length > 0) {
            localStorage.setItem('clinicaApp_driveRaizId', existentes[0].id);
            window.location.href = 'app.html';
            return;
        }

        // Primeiro acesso: criar toda a estrutura
        this.progresso('Criando pasta ClinicaApp no seu Drive...', 10);
        const pastaRaiz = await DriveService.criarPasta(token, 'ClinicaApp');
        localStorage.setItem('clinicaApp_driveRaizId', pastaRaiz.id);

        this.progresso('Criando subpastas...', 25);
        const pastaDados  = await DriveService.criarPasta(token, 'dados',  pastaRaiz.id);
        await DriveService.criarPasta(token, 'anexos', pastaRaiz.id);

        const nomes = Object.keys(this.PLANILHAS);
        for (let i = 0; i < nomes.length; i++) {
            const cfg = this.PLANILHAS[nomes[i]];
            this.progresso(`Criando planilha "${cfg.nome}"...`, 40 + i * 14);
            const planilha = await SheetsService.criarPlanilha(token, cfg.nome, cfg.abas);
            await DriveService.moverArquivo(token, planilha.spreadsheetId, pastaDados.id);
        }

        this.progresso('Tudo pronto!', 100);
        await new Promise(r => setTimeout(r, 800));
        window.location.href = 'app.html';
    }
};
