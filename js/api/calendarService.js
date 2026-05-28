const CalendarService = {
    BASE: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',

    async criarEvento(token, { titulo, descricao, dataHoraInicio, dataHoraFim }) {
        const resp = await fetch(this.BASE, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: titulo,
                description: descricao || '',
                start: { dateTime: dataHoraInicio, timeZone: 'America/Sao_Paulo' },
                end:   { dateTime: dataHoraFim,   timeZone: 'America/Sao_Paulo' }
            })
        });
        return await resp.json();
    },

    async atualizarEvento(token, eventId, { titulo, descricao, dataHoraInicio, dataHoraFim }) {
        const resp = await fetch(`${this.BASE}/${eventId}`, {
            method: 'PATCH',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: titulo,
                description: descricao || '',
                start: { dateTime: dataHoraInicio, timeZone: 'America/Sao_Paulo' },
                end:   { dateTime: dataHoraFim,   timeZone: 'America/Sao_Paulo' }
            })
        });
        return await resp.json();
    },

    async deletarEvento(token, eventId) {
        await fetch(`${this.BASE}/${eventId}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token }
        });
    }
};
