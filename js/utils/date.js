const DateUtils = {
    HORA_INICIO: 8,
    HORA_FIM: 18,
    NUM_SLOTS: 20, // (18-8) * 2

    inicioSemana(data = new Date()) {
        const d = new Date(data);
        const dia = d.getDay();
        const diff = dia === 0 ? -6 : 1 - dia; // força segunda-feira
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    adicionarDias(data, n) {
        const d = new Date(data);
        d.setDate(d.getDate() + n);
        return d;
    },

    formatarDiaMes(data) {
        return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    },

    formatarHora(data) {
        return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    },

    slotParaHora(slot) {
        const totalMin = this.HORA_INICIO * 60 + slot * 30;
        const h = String(Math.floor(totalMin / 60)).padStart(2, '0');
        const m = String(totalMin % 60).padStart(2, '0');
        return `${h}:${m}`;
    },

    horaParaSlot(horaStr) {
        const [h, m] = horaStr.split(':').map(Number);
        return (h - this.HORA_INICIO) * 2 + Math.floor(m / 30);
    },

    dataHoraISO(dataStr, horaStr) {
        // dataStr: "2026-05-28", horaStr: "14:00"
        return new Date(`${dataStr}T${horaStr}:00`).toISOString();
    },

    isSameDay(d1, d2) {
        return d1.toDateString() === d2.toDateString();
    },

    adicionarMinutos(isoStr, minutos) {
        return new Date(new Date(isoStr).getTime() + minutos * 60000).toISOString();
    }
};
