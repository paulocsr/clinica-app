const AUTH = {
    CLIENT_ID: '739223236653-k755g3ncb1t17ei52dlq0ifa2o159aa0.apps.googleusercontent.com',
    ESCOPOS: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/calendar'
    ].join(' '),

    tokenClient: null,

    getToken() {
        const dados = localStorage.getItem('clinicaApp_token');
        if (!dados) return null;
        const { accessToken, expiresAt } = JSON.parse(dados);
        if (Date.now() > expiresAt) {
            localStorage.removeItem('clinicaApp_token');
            return null;
        }
        return accessToken;
    },

    salvarToken(accessToken, expiresIn) {
        // Subtrai 60s para renovar antes de expirar de verdade
        const expiresAt = Date.now() + (expiresIn * 1000) - 60000;
        localStorage.setItem('clinicaApp_token', JSON.stringify({ accessToken, expiresAt }));
    },

    getUsuario() {
        const dados = localStorage.getItem('clinicaApp_usuario');
        return dados ? JSON.parse(dados) : null;
    },

    salvarUsuario(usuario) {
        localStorage.setItem('clinicaApp_usuario', JSON.stringify(usuario));
    },

    logout() {
        const token = this.getToken();
        if (token) google.accounts.oauth2.revoke(token, () => {});
        localStorage.removeItem('clinicaApp_token');
        localStorage.removeItem('clinicaApp_usuario');
        localStorage.removeItem('clinicaApp_driveRaizId');
        window.location.href = 'index.html';
    },

    solicitarToken(callback) {
        if (!this.tokenClient) {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.ESCOPOS,
                callback,
            });
        }
        this.tokenClient.requestAccessToken();
    }
};
