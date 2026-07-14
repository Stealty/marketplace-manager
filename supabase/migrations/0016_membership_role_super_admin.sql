-- Adiciona o valor 'super_admin' ao enum membership_role.
-- Fica isolado num migration próprio porque o Postgres não permite usar um
-- valor de enum recém-adicionado na mesma transação em que foi criado — o
-- restante da implementação (funções, policies, seed) vem no migration
-- seguinte (0017), depois que este valor já está commitado.

alter type membership_role add value 'super_admin';
