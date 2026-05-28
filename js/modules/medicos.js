const Medicos = {
    _cache: null,

    // Medicos tab: id, nome, especialidade, crm, cor_agenda, ativo, email, token
    _rowToObj(row, sheetRow) {
        return {
            _sheetRow: sheetRow,
            id:            row[0] || '',
            nome:          row[1] || '',
            especialidade: row[2] || '',
            crm:           row[3] || '',
            cor_agenda:    row[4] || '#1a73e8',
            ativo:         row[5] || 'TRUE',
            email:         row[6] || '',
            token:         row[7] || ''
        };
    },

    _objToRow(m) {
        return [m.id, m.nome, m.especialidade, m.crm, m.cor_agenda, m.ativo, m.email, m.token];
    },

    gerarId() {
        const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return `med_${d}_${Math.random().toString(36).slice(2, 6)}`;
    },

    gerarToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(12)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async listar(token, sheetId) {
        if (this._cache) return this._cache;
        const rows = await SheetsService.lerLinhas(token, sheetId, 'Medicos');
        this._cache = rows.slice(1)
            .map((r, i) => this._rowToObj(r, i + 2))
            .filter(m => m.id && m.ativo === 'TRUE');
        return this._cache;
    },

    async listarTodos(token, sheetId) {
        const rows = await SheetsService.lerLinhas(token, sheetId, 'Medicos');
        return rows.slice(1)
            .map((r, i) => this._rowToObj(r, i + 2))
            .filter(m => m.id);
    },

    async cadastrar(token, sheetId, dados) {
        const medico = {
            ...dados,
            id: this.gerarId(),
            ativo: 'TRUE',
            token: this.gerarToken()
        };
        await SheetsService.adicionarLinha(token, sheetId, 'Medicos', this._objToRow(medico));
        this._cache = null;
        return medico;
    },

    async editar(token, sheetId, medico) {
        await SheetsService.atualizarLinha(token, sheetId, 'Medicos', medico._sheetRow, this._objToRow(medico));
        this._cache = null;
    },

    async desativar(token, sheetId, medico) {
        await this.editar(token, sheetId, { ...medico, ativo: 'FALSE' });
    },

    porToken(token, lista) {
        return (lista || this._cache || []).find(m => m.token === token) || null;
    },

    invalidarCache() { this._cache = null; }
};
