const Agenda = {
    _cache: null,

    _rowToObj(row, sheetRow) {
        return {
            _sheetRow: sheetRow,
            id:               row[0]  || '',
            paciente_id:      row[1]  || '',
            medico:           row[2]  || '',
            data_hora:        row[3]  || '',
            duracao_min:      parseInt(row[4]) || 30,
            status:           row[5]  || 'agendado',
            tipo:             row[6]  || 'Consulta',
            anotacoes:        row[7]  || '',
            valor:            row[8]  || '',
            forma_pagamento:  row[9]  || '',
            status_pagamento: row[10] || '',
            calendar_event_id: row[11] || '',
            data_registro:    row[12] || ''
        };
    },

    _objToRow(c) {
        return [
            c.id, c.paciente_id, c.medico, c.data_hora, c.duracao_min,
            c.status, c.tipo, c.anotacoes, c.valor, c.forma_pagamento,
            c.status_pagamento, c.calendar_event_id, c.data_registro
        ];
    },

    gerarId() {
        const data = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.random().toString(36).slice(2, 6);
        return `con_${data}_${rand}`;
    },

    async listarTodos(token, sheetId) {
        if (this._cache) return this._cache;
        const rows = await SheetsService.lerLinhas(token, sheetId, 'Consultas');
        this._cache = rows.slice(1).map((r, i) => this._rowToObj(r, i + 2));
        return this._cache;
    },

    filtrarSemana(inicioSemana) {
        if (!this._cache) return [];
        const fim = DateUtils.adicionarDias(inicioSemana, 6);
        fim.setHours(23, 59, 59, 999);
        return this._cache.filter(c => {
            if (c.status === 'cancelado') return false;
            const dt = new Date(c.data_hora);
            return dt >= inicioSemana && dt <= fim;
        });
    },

    verificarConflito(medico, dataHora, duracao, excluirId = null) {
        if (!this._cache) return false;
        const inicio = new Date(dataHora);
        const fim = new Date(inicio.getTime() + duracao * 60000);
        return this._cache.some(c => {
            if (c.id === excluirId || c.status === 'cancelado') return false;
            if (c.medico !== medico) return false;
            const cInicio = new Date(c.data_hora);
            const cFim = new Date(cInicio.getTime() + c.duracao_min * 60000);
            return inicio < cFim && fim > cInicio;
        });
    },

    async agendar(token, sheetId, dados, nomePaciente) {
        const consulta = {
            ...dados,
            id: this.gerarId(),
            status: 'agendado',
            anotacoes: dados.anotacoes || '',
            valor: '', forma_pagamento: '', status_pagamento: '',
            calendar_event_id: '',
            data_registro: new Date().toISOString()
        };

        try {
            const evento = await CalendarService.criarEvento(token, {
                titulo: `${dados.tipo}: ${nomePaciente} — Dr(a). ${dados.medico}`,
                descricao: dados.anotacoes || '',
                dataHoraInicio: dados.data_hora,
                dataHoraFim: DateUtils.adicionarMinutos(dados.data_hora, dados.duracao_min)
            });
            consulta.calendar_event_id = evento.id || '';
        } catch (e) {
            console.warn('Evento Calendar não criado:', e);
        }

        await SheetsService.adicionarLinha(token, sheetId, 'Consultas', this._objToRow(consulta));
        this._cache = null;
        return consulta;
    },

    async remarcar(token, sheetId, consulta, novaDataHora, nomePaciente) {
        const atualizada = { ...consulta, data_hora: novaDataHora };

        if (consulta.calendar_event_id) {
            try {
                await CalendarService.atualizarEvento(token, consulta.calendar_event_id, {
                    titulo: `${consulta.tipo}: ${nomePaciente} — Dr(a). ${consulta.medico}`,
                    descricao: consulta.anotacoes || '',
                    dataHoraInicio: novaDataHora,
                    dataHoraFim: DateUtils.adicionarMinutos(novaDataHora, consulta.duracao_min)
                });
            } catch (e) { console.warn('Erro ao atualizar Calendar:', e); }
        }

        await SheetsService.atualizarLinha(token, sheetId, 'Consultas', consulta._sheetRow, this._objToRow(atualizada));
        this._cache = null;
    },

    async atualizarStatus(token, sheetId, consulta, novoStatus) {
        const atualizada = { ...consulta, status: novoStatus };

        if (novoStatus === 'cancelado' && consulta.calendar_event_id) {
            try {
                await CalendarService.deletarEvento(token, consulta.calendar_event_id);
            } catch (e) { console.warn('Erro ao deletar Calendar:', e); }
        }

        await SheetsService.atualizarLinha(token, sheetId, 'Consultas', consulta._sheetRow, this._objToRow(atualizada));
        this._cache = null;
    },

    invalidarCache() {
        this._cache = null;
    }
};
