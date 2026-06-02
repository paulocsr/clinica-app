const Clinicas = {
    _clinicasCache: null,
    _salasCache: null,

    _clinicaToObj(row, i) { return { _sheetRow: i+2, id: row[0]||'', nome: row[1]||'', ativo: row[2]||'TRUE' }; },
    _clinicaToRow(c) { return [c.id, c.nome, c.ativo]; },
    _salaToObj(row, i) { return { _sheetRow: i+2, id: row[0]||'', clinica_id: row[1]||'', nome: row[2]||'', ativo: row[3]||'TRUE', turnos: row[4]||'manha,tarde,noite' }; },
    _salaToRow(s) { return [s.id, s.clinica_id, s.nome, s.ativo, s.turnos||'manha,tarde,noite']; },

    _gerarId(prefixo) {
        const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
        return `${prefixo}_${d}_${Math.random().toString(36).slice(2,6)}`;
    },

    async listarClinicas(token, sheetId) {
        if (this._clinicasCache) return this._clinicasCache;
        const rows = await SheetsService.lerLinhas(token, sheetId, 'Clinicas');
        this._clinicasCache = rows.slice(1).map((r,i) => this._clinicaToObj(r,i)).filter(c => c.id && c.ativo === 'TRUE');
        return this._clinicasCache;
    },

    async listarSalas(token, sheetId) {
        if (this._salasCache) return this._salasCache;
        const rows = await SheetsService.lerLinhas(token, sheetId, 'Salas');
        this._salasCache = rows.slice(1).map((r,i) => this._salaToObj(r,i)).filter(s => s.id && s.ativo === 'TRUE');
        return this._salasCache;
    },

    salasDeClinica(clinicaId) {
        return (this._salasCache || []).filter(s => s.clinica_id === clinicaId);
    },

    async cadastrarClinica(token, sheetId, nome) {
        const c = { id: this._gerarId('cli'), nome, ativo: 'TRUE' };
        await SheetsService.adicionarLinha(token, sheetId, 'Clinicas', this._clinicaToRow(c));
        this._clinicasCache = null;
        return c;
    },

    async cadastrarSala(token, sheetId, clinicaId, nome, turnos = 'manha,tarde,noite') {
        const s = { id: this._gerarId('sal'), clinica_id: clinicaId, nome, ativo: 'TRUE', turnos };
        await SheetsService.adicionarLinha(token, sheetId, 'Salas', this._salaToRow(s));
        this._salasCache = null;
        return s;
    },

    async desativarClinica(token, sheetId, clinica) {
        await SheetsService.atualizarLinha(token, sheetId, 'Clinicas', clinica._sheetRow, this._clinicaToRow({...clinica, ativo:'FALSE'}));
        this._clinicasCache = null;
    },

    async atualizarTurnosSala(token, sheetId, sala, turnos) {
        await SheetsService.atualizarLinha(token, sheetId, 'Salas', sala._sheetRow, this._salaToRow({...sala, turnos}));
        this._salasCache = null;
    },

    async desativarSala(token, sheetId, sala) {
        await SheetsService.atualizarLinha(token, sheetId, 'Salas', sala._sheetRow, this._salaToRow({...sala, ativo:'FALSE'}));
        this._salasCache = null;
    },

    invalidarCache() { this._clinicasCache = null; this._salasCache = null; }
};
