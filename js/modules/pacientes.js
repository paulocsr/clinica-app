const Pacientes = {
    _cache: null,

    _rowToObj(row, sheetRow) {
        return {
            _sheetRow: sheetRow,
            id:                 row[0]  || '',
            nome_completo:      row[1]  || '',
            data_nascimento:    row[2]  || '',
            cpf:                row[3]  || '',
            telefone:           row[4]  || '',
            email:              row[5]  || '',
            convenio:           row[6]  || '',
            numero_convenio:    row[7]  || '',
            medico_responsavel: row[8]  || '',
            observacoes_gerais: row[9]  || '',
            data_cadastro:      row[10] || '',
            ativo:              row[11] || 'TRUE'
        };
    },

    _objToRow(p) {
        return [
            p.id, p.nome_completo, p.data_nascimento, p.cpf,
            p.telefone, p.email, p.convenio, p.numero_convenio,
            p.medico_responsavel, p.observacoes_gerais, p.data_cadastro, p.ativo
        ];
    },

    gerarId() {
        const data = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.random().toString(36).slice(2, 6);
        return `pac_${data}_${rand}`;
    },

    async listar(token, sheetId) {
        if (this._cache) return this._cache;
        const rows = await SheetsService.lerLinhas(token, sheetId, 'Pacientes');
        this._cache = rows
            .slice(1)                                      // pula cabeçalho
            .map((r, i) => this._rowToObj(r, i + 2))      // i+2 = linha real na planilha
            .filter(p => p.ativo === 'TRUE');
        return this._cache;
    },

    buscar(termo) {
        if (!this._cache) return [];
        const t = termo.toLowerCase().trim();
        if (!t) return this._cache;
        return this._cache.filter(p =>
            p.nome_completo.toLowerCase().includes(t) ||
            p.cpf.includes(t) ||
            p.telefone.includes(t)
        );
    },

    async cadastrar(token, sheetId, dados) {
        const pac = {
            ...dados,
            id: this.gerarId(),
            data_cadastro: new Date().toISOString(),
            ativo: 'TRUE',
            _sheetRow: null
        };
        await SheetsService.adicionarLinha(token, sheetId, 'Pacientes', this._objToRow(pac));
        this._cache = null;
        return pac;
    },

    async editar(token, sheetId, pac) {
        await SheetsService.atualizarLinha(token, sheetId, 'Pacientes', pac._sheetRow, this._objToRow(pac));
        this._cache = null;
    },

    async desativar(token, sheetId, pac) {
        await this.editar(token, sheetId, { ...pac, ativo: 'FALSE' });
    },

    invalidarCache() {
        this._cache = null;
    }
};
