# 🐾 Pet Personalè — Sistema de Gestão e Agendamento Inteligente

Um sistema Full Stack desenvolvido para automatizar o fluxo de atendimento de um centro de estética animal, integrando agendamento online com validação de conflitos, geração automática de Ordens de Serviço em PDF, notificações instantâneas via WhatsApp e painel administrativo protegido.

---

## 🚀 Demonstração ao Vivo (Modo Sandbox)
> **Aviso de Privacidade / LGPD:** Para proteger os dados das clientes reais, o link de demonstração abaixo opera em **Modo Sandbox**. As mensagens de WhatsApp são simuladas no servidor e os e-mails são redirecionados para um ambiente controlado.

* **🔗 Acessar o Site Demonstrativo:** *(Coloque aqui o link do site quando hospedarmos, ex: https://petpersonale.onrender.com
* **🔐 Acesso ao Painel da Especialista (Área de Testes):**
  * **Senha de Demonstração:** `demo123`

---

## 🛠️ Tecnologias Utilizadas
* **Backend:** Node.js, Express.js
* **Banco de Dados:** MongoDB Atlas (Mongoose ODM)
* **Automação & Comunicação:** `whatsapp-web.js` (Bot WhatsApp), `nodemailer` (E-mail)
* **Geração de Documentos:** `pdfkit` (Ordens de Serviço formatadas em A4)
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla) e Design Responsivo

---

## ⚙️ Funcionalidades em Destaque
* **⚡ Algoritmo Anti-Conflito:** O backend calcula automaticamente o tempo de cada serviço somado ao porte do animal, impedindo agendamentos simultâneos ou sobreposições.
* **📱 Notificações Multi-Canal:** Disparo de mensagens personalizadas no WhatsApp do tutor no momento do agendamento e aviso de conclusão/retirada do pet em tempo real.
* **🛡️ Arquitetura Blindada:** Proteção de rotas administrativas com Tokens de Sessão e isolamento integral de chaves secretas usando variáveis de ambiente (`dotenv`).
* **☁️ Migração em Nuvem:** Implementação de ponte automática para sincronização de dados de arquivos locais para o MongoDB Atlas.
