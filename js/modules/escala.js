const Escala = {
    _cache: null,

    TURNOS: {
        manha: { label: 'M', titulo: 'Manhã',  bg: '#dbeafe', cor: '#1d4ed8' },
        tarde: { label: 'T', titulo: 'Tarde',  bg: '#fef3c7', cor: '#92400e' },
        noite: { label: 'N', titulo: 'Noite',  bg: '#f3e8ff', cor: '#7e22ce' }
    },

    // Schema: id, sala_id, medico_id, data, turno, observacao, data_registro
    _rowToObj(row, sheetRow) {
        return {
            _sheetRow: sheetRow,
            id:           row[0] || '',
            sala_id:      row[1] || '',
            medico_id:    row[2] || '',
            data:         row[3] || '',
            turno:        row[4] || '',
            observacao:   row[5] || '',
            data_registro: row[6] || ''
        };
    },

    _objToRow(e) {
        return [e.id, e.sala_id, e.medico_id, e.data, e.turno, e.observacao, e.data_registro];
    },

    _gerarId() {
        const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
        return `esc_${d}_${Math.random().toString(36).slice(2,6)}`;
    },

    async _ensureCache(token, sheetId) {
        if (this._cache) return;
        const rows = await SheetsService.lerLinhas(token, sheetId, 'Escala');
        this._cache = rows.slice(1)
            .map((r, i) => this._rowToObj(r, i + 2))
            .filter(e => e.id && e.sala_id && e.medico_id);
    },

    async listarMes(token, sheetId, ano, mes) {
        await this._ensureCache(token, sheetId);
        const prefixo = `${ano}-${String(mes).padStart(2,'0')}`;
        return this._cache.filter(e => e.data.startsWith(prefixo));
    },

    getEntrada(salaId, data, turno) {
        return (this._cache || []).find(e =>
            e.sala_id === salaId && e.data === data && e.turno === turno
        ) || null;
    },

    async atribuirMedico(token, sheetId, salaId, data, turno, medicoId) {
        await this._ensureCache(token, sheetId);
        const existing = this.getEntrada(salaId, data, turno);

        if (existing) {
            // Update (or clear if medicoId is empty)
            await SheetsService.atualizarLinha(token, sheetId, 'Escala', existing._sheetRow,
                this._objToRow({ ...existing, medico_id: medicoId || '' }));
        } else if (medicoId) {
            const nova = {
                id: this._gerarId(), sala_id: salaId, medico_id: medicoId,
                data, turno, observacao: '', data_registro: new Date().toISOString()
            };
            await SheetsService.adicionarLinha(token, sheetId, 'Escala', this._objToRow(nova));
        }
        this._cache = null;
    },

    invalidarCache() { this._cache = null; }
};
