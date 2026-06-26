# Rogério Cabelos - Agendamento Inteligente 💈

Este é um sistema de agendamento online inteligente, rápido e sem necessidade de login para a barbearia **Rogério Cabelos**, gerenciada pelo barbeiro Rogério Alves. O projeto une um design clássico e elegante (vintage dark-theme) com a praticidade moderna de controle de horários integrado diretamente a uma planilha do Google Sheets (que funciona como banco de dados gratuito) e disparos rápidos de mensagens pelo WhatsApp.

## 🔗 Link de Acesso
O site já está publicado e pode ser acessado em tempo real aqui:
👉 **[Rogério Cabelos - Agendar Horário](https://allandevindie.github.io/site-agendamento-inteligente/)**

---

## 🚀 Principais Funcionalidades

### 1. Funil de Agendamento Direto (Sem Login)
O cliente escolhe o dia, o horário disponível e preenche apenas **Nome** e **WhatsApp** para solicitar o agendamento. Sem senhas, sem e-mails e sem fricção.

### 2. Agendamento Inteligente em Tempo Real
- **Cálculo Dinâmico:** Exibe apenas os próximos 7 dias úteis de funcionamento, pulando domingos automaticamente.
- **Bloqueio de Horários Passados:** Se o cliente for agendar para o dia de hoje, o site esconde automaticamente os horários que já passaram para evitar marcações retroativas.
- **Limite de Clientes:** Suporta até 2 clientes simultâneos por hora (a vaga se esgota e o horário fica como "Lotado" automaticamente ao atingir o limite).

### 3. Banco de Dados Gratuito com Google Sheets
Todos os agendamentos são salvos em nuvem na sua própria planilha do Google Drive de forma instantânea através de uma integração segura com Google Apps Script.

### 4. Painel Administrativo Embutido e Protegido
- Acessível diretamente pelo site dando um **duplo clique no logotipo** no topo ou clicando no rodapé.
- Protegido pela senha padrão: `admin`.
- Permite visualizar a lista de agendamentos organizada por status (*Pendentes*, *Confirmados* e *Cancelados*).

### 5. Confirmação / Cancelamento Inteligente via WhatsApp (Custo Zero)
Ao gerenciar um agendamento no Painel Admin:
- O status é atualizado na planilha automaticamente.
- Uma nova aba do WhatsApp Web/Mobile é aberta direcionada ao celular do cliente com uma mensagem personalizada pré-formatada de acordo com a ação (confirmação ou aviso de cancelamento), economizando tempo de digitação.

### 6. Configurações de Conexão Protegidas
O campo de configuração da planilha fica sob uma aba colapsável trancada e mascarada por segurança. Alterações exigem passar por avisos explícitos e dupla confirmação, prevenindo exclusões ou edições acidentais que poderiam quebrar o agendamento.

---

## 🛠️ Como Configurar a Planilha (Banco de Dados)

Se precisar reconectar ou criar uma nova planilha de banco de dados, siga as instruções abaixo:

1. Crie uma nova planilha no **Google Sheets** (Google Drive).
2. Na primeira linha, crie exatamente estas colunas com os cabeçalhos:
   `ID` | `Cliente` | `WhatsApp` | `Data` | `Horario` | `Status` | `CriadoEm`
3. No menu superior da planilha, clique em **Extensões** -> **Apps Script**.
4. Copie todo o código contido no arquivo `google_apps_script.js` deste repositório e cole no editor do Apps Script, substituindo o código existente. Salve (Ctrl + S).
5. Clique no botão azul **Implantar** (canto superior direito) -> **Nova implantação**.
6. Selecione o tipo de implantação como **App da Web** (ícone de engrenagem).
   - Configure **Executar como:** "Eu (seu email)"
   - Configure **Quem tem acesso:** "Qualquer pessoa" (isso é vital para o site conectar).
7. Clique em **Implantar**, autorize os acessos na sua conta Google e copie a **URL do App da Web** gerada.
8. Acesse o site do agendamento, abra o **Painel Administrativo** (duplo clique no logo -> senha `admin`), abra a seção "Configurações de Conexão", clique em **Editar**, cole a URL copiada e clique em **Salvar Alteração**.

---

## 📦 Estrutura de Arquivos do Projeto

- `index.html` - Estrutura principal da página e elementos do painel administrativo.
- `style.css` - Estilização completa do layout vintage-modern com variáveis CSS responsivas.
- `app.js` - Lógica de agendamento, controle de estados, formatação de datas e requisições HTTP para a planilha.
- `google_apps_script.js` - Código do servidor a ser hospedado no Apps Script.
- `README.md` - Apresentação e guia do projeto.

---

## 📞 Informações de Contato do Salão

- **Dono:** Rogério Alves
- **WhatsApp:** +55 81 9110-3045
- **Instagram:** [@rogerio.cabelos](https://www.instagram.com/rogerio.cabelos/)
- **Horário de Funcionamento:** Segunda a Sábado (9h às 12h e 15h às 18h)
