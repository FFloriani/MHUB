# Guia de Deploy no Vercel

## Passo 1: Deploy Inicial
Execute no terminal:
```bash
vercel
```

Quando perguntar:
- **Nome do projeto**: `mhub` (minúsculas)
- **Diretório**: `./` (pressione Enter)
- **Configurações**: Aceite os padrões (pressione Enter)

## Passo 2: Configurar Variáveis de Ambiente

Após o deploy, configure as variáveis de ambiente no Vercel:

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `mhub`
3. Vá em **Settings** > **Environment Variables**
4. Adicione as seguintes variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=https://nguggatugusoogcgjuop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndWdnYXR1Z3Vzb29nY2dqdW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjA1ODksImV4cCI6MjA3OTczNjU4OX0.QiuG9xW3IHJm1cus4vJA55wD7EC9q7xjh52QvdhqaI8
```

5. Marque para **Production**, **Preview** e **Development**
6. Clique em **Save**

## Passo 3: Atualizar URL de Callback no Supabase

Após o deploy, você receberá uma URL do Vercel (ex: `https://mhub.vercel.app`)

1. Acesse o painel do Supabase
2. Vá em **Authentication** > **URL Configuration**
3. Adicione a URL de produção: `https://seu-projeto.vercel.app/auth/callback`
4. Salve as alterações

## Passo 4: Atualizar Google Console (Opcional)

Se quiser usar em produção:
1. Acesse Google Cloud Console
2. Adicione a nova URI de redirecionamento: `https://seu-projeto.vercel.app/auth/callback`

## Comandos Úteis

- `vercel` - Deploy para preview
- `vercel --prod` - Deploy para produção
- `vercel env ls` - Listar variáveis de ambiente
- `vercel env add` - Adicionar variável de ambiente via CLI

