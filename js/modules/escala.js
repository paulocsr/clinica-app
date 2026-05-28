const Escala = {
    _cache: null,

    TURNOS: {
        manha:    { label: 'M', titulo: 'Manhã',    bg: '#dbeafe', cor: '#1d4ed8' },
        tarde:    { label: 'T', titulo: 'Tarde',    bg: '#fef3c7', cor: '#92400e' },
        dia_todo: { label: 'D', titulo: 'Dia todo', bg: '#dcfce7', cor: '#166534' }
    },

    _rowToObj(row, sheetRow) {
        return {
            _sheetRow: sheetRow,
            id:           row[0] || '',
            medico_id:    row[1] || '',
            data:         row[2] || '',
            turno:        row[3] || '',
            observacao:   row[4] || '',
            data_registro: row[5] || ''
        };
    },

    _objToRow(e) {
        return [e.id, e.medico_id, e.data, e.turno, e.observacao, e.data_registro];
    },

    gerarId() {
        const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return `esc_${d}_${Math.random().toString(36).slice(2, 6)}`;
    },

    async _ensureCache(token, sheetId) {
        if (this._cache) return;
        const rows = await SheetsService.lerLinhas(token, sheetId, 'Escala');
        this._cache = rows.slice(1)
            .map((r, i) => this._rowToObj(r, i + 2))
            .filter(e => e.id && e.turno); // ignora linhas removidas
    },

    async listarMes(token, sheetId, ano, mes) {
        await this._ensureCache(token, sheetId);
        const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
        return this._cache.filter(e => e.data.startsWith(prefixo));
    },

    async alterarTurno(token, sheetId, medicoId, data, novoTurno) {
        await this._ensureCache(token, sheetId);
        const existente = this._cache.find(e => e.medico_id === medicoId && e.data === data);

        if (existente) {
            const atualizado = { ...existente, turno: novoTurno };
            await SheetsService.atualizarLinha(token, sheetId, 'Escala', existente._sheetRow, this._objToRow(atualizado));
        } else if (novoTurno) {
            const nova = {
                id: this.gerarId(),
                medico_id: medicoId,
                data,
                turno: novoTurno,
                observacao: '',
                data_registro: new Date().toISOString()
            };
            await SheetsService.adicionarLinha(token, sheetId, 'Escala', this._objToRow(nova));
        }
        this._cache = null;
    },

    invalidarCache() { this._cache = null; }
};
