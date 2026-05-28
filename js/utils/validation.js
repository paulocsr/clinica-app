const Validation = {
    cpf(cpf) {
        const nums = cpf.replace(/\D/g, '');
        if (nums.length !== 11 || /^(\d)\1+$/.test(nums)) return false;
        let soma = 0;
        for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
        let r = (soma * 10) % 11;
        if (r === 10 || r === 11) r = 0;
        if (r !== parseInt(nums[9])) return false;
        soma = 0;
        for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
        r = (soma * 10) % 11;
        if (r === 10 || r === 11) r = 0;
        return r === parseInt(nums[10]);
    },

    formatarCPF(cpf) {
        return cpf.replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    },

    formatarTelefone(tel) {
        const nums = tel.replace(/\D/g, '');
        if (nums.length === 11) return nums.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        if (nums.length === 10) return nums.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        return tel;
    }
};
