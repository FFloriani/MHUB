# Configuração do Supabase - Tabelas Financeiras

Para habilitar a seção Financeiro, você precisa criar as tabelas no Supabase.

## Passo a Passo:

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New Query**
5. Cole o conteúdo do arquivo `supabase_migrations/create_financial_tables.sql`
6. Clique em **Run** ou pressione `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

## O que o SQL cria:

- **Tabela `revenues`**: Armazena receitas (Salário, Aluguel, etc.)
- **Tabela `investments`**: Armazena investimentos (Ações, Tesouro Direto, etc.)
- **Tabela `expenses`**: Armazena despesas (Fixas, Variáveis, Extras, Adicionais)

Todas as tabelas têm:
- Row Level Security (RLS) configurado
- Políticas de segurança em português
- Índices para performance
- Triggers para atualizar `updated_at` automaticamente

## Estrutura:

- **Receitas**: Categoria, Valor, Mês, Ano
- **Investimentos**: Categoria, Valor, Mês, Ano
- **Despesas**: Tipo (fixa/variavel/extra/adicional), Categoria, Item, Valor, Mês, Ano

## Pronto!

Após executar o SQL, a seção Financeiro estará disponível em `/financial` com:
- Tabelas interativas para inserir dados
- Gráficos de visualização
- Resumo financeiro com saldo
- Cálculo automático de percentuais

