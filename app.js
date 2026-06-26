// CONFIGURAÇÕES DO SISTEMA
const CONFIG = {
  adminPassword: "admin", // Senha padrão para acessar o painel administrativo
  localStorageKey: "rogerio_cabelos_local_bookings",
  sheetUrlKey: "rogerio_cabelos_sheet_url",
  workingHours: ["09:00", "10:00", "11:00", "15:00", "16:00", "17:00"], // Intervalos de 1 hora
  maxClientsPerSlot: 2,
  serviceName: "Cabelo e Bigode",
  servicePrice: 35.00
};

// ESTADO GLOBAL DO APLICATIVO
let state = {
  bookings: [], // Agendamentos carregados
  sheetUrl: localStorage.getItem(CONFIG.sheetUrlKey) || "", // URL da API do Google Sheets
  selectedDate: "", // formato YYYY-MM-DD
  selectedTime: "", // formato HH:MM
  isAdminAuthenticated: false,
  isUsingMockDb: false
};

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
  initDateSelection();
  loadBookings();
  setupEventListeners();
  checkDirectAdminAccess();
});

// 1. CARREGAR AGENDAMENTOS (BD ou LocalStorage)
async function loadBookings() {
  if (state.sheetUrl) {
    try {
      showLoading(true);
      const response = await fetch(state.sheetUrl, { method: 'GET' });
      const result = await response.json();
      
      if (result.status === "success") {
        state.bookings = (result.data || []).map(normalizeBooking);
        state.isUsingMockDb = false;
        toggleMockBanner(false);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Erro ao conectar com Google Sheets, usando mock db:", error);
      loadMockBookings();
    } finally {
      showLoading(false);
    }
  } else {
    loadMockBookings();
  }
  
  // Atualiza slots se a data já estiver selecionada
  if (state.selectedDate) {
    renderTimeSlots(state.selectedDate);
  }
  
  // Atualiza painel admin se autenticado
  if (state.isAdminAuthenticated) {
    renderAdminBookings();
  }
}

function loadMockBookings() {
  const localData = localStorage.getItem(CONFIG.localStorageKey);
  const rawBookings = localData ? JSON.parse(localData) : [];
  state.bookings = rawBookings.map(normalizeBooking);
  state.isUsingMockDb = true;
  toggleMockBanner(true);
}

// Normaliza o objeto de agendamento independente de como os dados venham do Google Sheets
function normalizeBooking(b) {
  const getProp = (obj, name) => {
    if (!obj) return "";
    const lower = name.toLowerCase();
    for (let key in obj) {
      if (key.toLowerCase() === lower) return obj[key];
    }
    return "";
  };

  // 1. Normalizar Data para YYYY-MM-DD
  let rawData = getProp(b, "Data");
  let formattedData = "";

  if (rawData) {
    if (typeof rawData === "string") {
      if (rawData.includes("T")) {
        formattedData = rawData.split("T")[0];
      } else if (rawData.includes("-")) {
        formattedData = rawData;
      } else if (rawData.includes("/")) {
        // Conversão de DD/MM/YYYY para YYYY-MM-DD
        const parts = rawData.split("/");
        if (parts.length === 3) {
          formattedData = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          formattedData = rawData;
        }
      } else {
        formattedData = rawData;
      }
    } else {
      // Se for um objeto Date do JavaScript
      try {
        const d = new Date(rawData);
        if (!isNaN(d.getTime())) {
          let year = d.getFullYear();
          let month = "" + (d.getMonth() + 1);
          let day = "" + d.getDate();
          if (month.length < 2) month = "0" + month;
          if (day.length < 2) day = "0" + day;
          formattedData = `${year}-${month}-${day}`;
        }
      } catch (err) {
        formattedData = String(rawData);
      }
    }
  }

  // 2. Normalizar Horário para HH:MM
  let rawTime = getProp(b, "Horario");
  let formattedTime = "";
  if (rawTime) {
    if (typeof rawTime === "string") {
      if (rawTime.includes("T")) {
        // "1899-12-30T10:00:00.000Z" -> "10:00"
        const timePart = rawTime.split("T")[1];
        formattedTime = timePart.substring(0, 5);
      } else {
        formattedTime = rawTime.substring(0, 5);
      }
    } else {
      try {
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) {
          let hour = "" + d.getHours();
          let min = "" + d.getMinutes();
          if (hour.length < 2) hour = "0" + hour;
          if (min.length < 2) min = "0" + min;
          formattedTime = `${hour}:${min}`;
        }
      } catch (err) {
        formattedTime = String(rawTime);
      }
    }
  }

  return {
    ID: getProp(b, "ID") || "mock-" + Date.now() + Math.random().toString(36).substr(2, 5),
    Cliente: getProp(b, "Cliente") || "Cliente Sem Nome",
    WhatsApp: String(getProp(b, "WhatsApp") || "").replace(/\D/g, ""),
    Data: formattedData,
    Horario: formattedTime,
    Status: getProp(b, "Status") || "Pendente"
  };
}

function toggleMockBanner(show) {
  const banner = document.getElementById("mock-db-banner");
  if (banner) {
    banner.style.display = show ? "block" : "none";
  }
}

function showLoading(isLoading) {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.style.display = isLoading ? "flex" : "none";
  }
}

// 2. SISTEMA DE DATAS (Funnel Step 1)
function initDateSelection() {
  const dateContainer = document.getElementById("date-options");
  if (!dateContainer) return;
  
  dateContainer.innerHTML = "";
  
  const dates = getAvailableDates(7); // próximas 7 datas úteis
  
  dates.forEach((dateObj, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "date-card ripple";
    btn.dataset.date = dateObj.raw;
    
    // Nome do dia amigável (Ex: "Seg") e data ("28/06")
    btn.innerHTML = `
      <span class="day-name">${dateObj.dayName}</span>
      <span class="day-num">${dateObj.formatted}</span>
    `;
    
    btn.addEventListener("click", () => {
      // Remover ativo de outros
      document.querySelectorAll(".date-card").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      
      selectDate(dateObj.raw);
    });
    
    dateContainer.appendChild(btn);
  });
}

// Gera as próximas N datas úteis, pulando domingo
function getAvailableDates(daysCount) {
  const dates = [];
  let current = new Date();
  
  while (dates.length < daysCount) {
    const dayOfWeek = current.getDay();
    
    if (dayOfWeek !== 0) { // 0 = Domingo
      const rawDate = formatDateYYYYMMDD(current);
      const dayName = getDayNameShort(current);
      const formatted = formatDateShort(current);
      
      dates.push({
        raw: rawDate,
        dayName: dayName,
        formatted: formatted
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function selectDate(dateString) {
  state.selectedDate = dateString;
  state.selectedTime = ""; // Limpa seleção de hora anterior
  
  // Avança na UI
  const timeSection = document.getElementById("step-time");
  timeSection.classList.remove("disabled-step");
  timeSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  renderTimeSlots(dateString);
}

// 3. SISTEMA DE HORÁRIOS (Funnel Step 2)
function renderTimeSlots(dateString) {
  const timeContainer = document.getElementById("time-options");
  if (!timeContainer) return;
  
  timeContainer.innerHTML = "";
  
  // Obter hora atual se for agendamento para hoje
  const todayStr = formatDateYYYYMMDD(new Date());
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  CONFIG.workingHours.forEach(time => {
    const [hour, minute] = time.split(":").map(Number);
    
    // 1. Filtrar horários passados se a data for hoje (agendamento inteligente)
    if (dateString === todayStr) {
      if (hour < currentHour || (hour === currentHour && currentMinute > 15)) {
        // Ignora horários que já passaram ou faltam menos de 15 min
        return;
      }
    }
    
    // 2. Verificar capacidade ocupada para essa data e hora
    const bookedCount = state.bookings.filter(b => b.Data === dateString && b.Horario === time && b.Status !== "Cancelado").length;
    const isAvailable = bookedCount < CONFIG.maxClientsPerSlot;
    
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `time-card ripple ${!isAvailable ? 'disabled' : ''}`;
    btn.disabled = !isAvailable;
    
    // Exibe vagas restantes (opcional/elegante)
    let badgeText = "Disponível";
    if (!isAvailable) {
      badgeText = "Lotado";
    } else if (bookedCount === 1) {
      badgeText = "Última vaga";
    }
    
    btn.innerHTML = `
      <span class="time-value">${time}</span>
      <span class="time-badge ${bookedCount === 1 ? 'warning' : ''}">${badgeText}</span>
    `;
    
    if (isAvailable) {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".time-card").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        selectTime(time);
      });
    }
    
    timeContainer.appendChild(btn);
  });
  
  // Se nenhum horário estiver disponível para hoje (por exemplo, fim do expediente)
  if (timeContainer.children.length === 0) {
    timeContainer.innerHTML = `<p class="no-slots-msg">Sem horários disponíveis para hoje. Escolha outro dia!</p>`;
  }
}

function selectTime(timeString) {
  state.selectedTime = timeString;
  
  // Exibe a seção de dados do cliente
  const clientSection = document.getElementById("step-client");
  clientSection.classList.remove("disabled-step");
  clientSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  updateSummary();
}

function updateSummary() {
  const summaryEl = document.getElementById("booking-summary");
  if (!summaryEl) return;
  
  const [year, month, day] = state.selectedDate.split("-");
  const formattedDate = `${day}/${month}/${year}`;
  
  summaryEl.innerHTML = `
    <div class="summary-details">
      <p><strong>Serviço:</strong> ${CONFIG.serviceName}</p>
      <p><strong>Preço:</strong> R$ ${CONFIG.servicePrice.toFixed(2).replace(".", ",")}</p>
      <p><strong>Data:</strong> ${formattedDate}</p>
      <p><strong>Horário:</strong> ${state.selectedTime}</p>
    </div>
  `;
}

// 4. ENVIO DO AGENDAMENTO
async function handleBookingSubmit(e) {
  e.preventDefault();
  
  const nameInput = document.getElementById("client-name");
  const phoneInput = document.getElementById("client-phone");
  
  if (!state.selectedDate || !state.selectedTime) {
    alert("Por favor, selecione uma data e horário primeiro!");
    return;
  }
  
  const name = nameInput.value.trim();
  const phone = phoneInput.value.replace(/\D/g, ""); // Apenas números
  
  if (!name) {
    alert("Por favor, insira seu nome!");
    return;
  }
  
  if (phone.length < 10) {
    alert("Por favor, insira um número de WhatsApp válido com DDD!");
    return;
  }
  
  const newBooking = {
    action: "add",
    name: name,
    phone: phone,
    date: state.selectedDate,
    time: state.selectedTime
  };
  
  try {
    showLoading(true);
    
    if (state.sheetUrl) {
      // Salva no Google Sheets
      const response = await fetch(state.sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(newBooking)
      });
      const result = await response.json();
      
      if (result.status === "success") {
        showSuccessModal(name, state.selectedDate, state.selectedTime);
      } else {
        throw new Error(result.message);
      }
    } else {
      // Salva localmente (Modo de teste)
      const mockId = "mock-" + Date.now();
      const localBookings = JSON.parse(localStorage.getItem(CONFIG.localStorageKey) || "[]");
      localBookings.push({
        ID: mockId,
        Cliente: name,
        WhatsApp: phone,
        Data: state.selectedDate,
        Horario: state.selectedTime,
        Status: "Pendente",
        CriadoEm: new Date().toISOString()
      });
      localStorage.setItem(CONFIG.localStorageKey, JSON.stringify(localBookings));
      
      showSuccessModal(name, state.selectedDate, state.selectedTime);
    }
  } catch (error) {
    console.error("Erro ao salvar agendamento:", error);
    alert("Houve um problema ao salvar seu agendamento. Tente novamente ou entre em contato pelo WhatsApp.");
  } finally {
    showLoading(false);
  }
}

function showSuccessModal(name, dateStr, timeStr) {
  const modal = document.getElementById("success-modal");
  const textEl = document.getElementById("success-modal-text");
  
  const [year, month, day] = dateStr.split("-");
  const formattedDate = `${day}/${month}/${year}`;
  
  textEl.innerHTML = `
    <p>Olá <strong>${name}</strong>, seu pedido de agendamento para <strong>Cabelo e Bigode</strong> foi recebido!</p>
    <p class="modal-time-detail">📅 ${formattedDate} às ⏰ ${timeStr}</p>
    <p>O barbeiro <strong>Rogério Alves</strong> foi notificado e irá confirmar o seu horário em breve. Você receberá uma notificação no seu WhatsApp assim que for confirmado!</p>
  `;
  
  modal.style.display = "flex";
  
  // Limpar formulário e recomeçar fluxo
  document.getElementById("booking-form").reset();
  state.selectedDate = "";
  state.selectedTime = "";
  
  // Desabilitar passos seguintes
  document.getElementById("step-time").classList.add("disabled-step");
  document.getElementById("step-client").classList.add("disabled-step");
  document.querySelectorAll(".date-card, .time-card").forEach(c => c.classList.remove("active"));
  
  // Recarregar os agendamentos da API
  loadBookings();
}

// 5. PAINEL ADMINISTRATIVO (ADMIN)
function toggleAdminPanel(show) {
  const panel = document.getElementById("admin-panel");
  if (!panel) return;
  
  if (show) {
    if (!state.isAdminAuthenticated) {
      const pwd = prompt("Digite a senha do administrador:");
      if (pwd === CONFIG.adminPassword) {
        state.isAdminAuthenticated = true;
        sessionStorage.setItem("rogerio_cabelos_admin_logged", "true");
      } else {
        alert("Senha incorreta!");
        return;
      }
    }
    
    panel.classList.add("open");
    
    // Configurações de trancamento inicial do input de URL
    const urlInput = document.getElementById("sheet-url-input");
    if (urlInput) {
      urlInput.value = state.sheetUrl;
      urlInput.type = "password";
      urlInput.disabled = true;
    }
    const editBtn = document.getElementById("edit-sheet-btn");
    const saveBtn = document.getElementById("save-sheet-btn");
    if (editBtn) editBtn.style.display = "block";
    if (saveBtn) saveBtn.style.display = "none";
    
    renderAdminBookings();
  } else {
    panel.classList.remove("open");
  }
}

function checkDirectAdminAccess() {
  if (sessionStorage.getItem("rogerio_cabelos_admin_logged") === "true") {
    state.isAdminAuthenticated = true;
  }
}

function saveSheetUrl() {
  const urlInput = document.getElementById("sheet-url-input");
  if (!urlInput) return;
  
  const newUrl = urlInput.value.trim();
  
  if (!confirm("⚠️ ATENÇÃO:\n\nDeseja salvar esta nova URL de conexão do Google Sheets?\nUma URL errada impedirá o funcionamento dos agendamentos no site.")) {
    return;
  }
  
  state.sheetUrl = newUrl;
  localStorage.setItem(CONFIG.sheetUrlKey, newUrl);
  alert("URL atualizada com sucesso! Reconectando ao banco de dados...");
  
  // Trancar novamente
  urlInput.type = "password";
  urlInput.disabled = true;
  document.getElementById("edit-sheet-btn").style.display = "block";
  document.getElementById("save-sheet-btn").style.display = "none";
  
  loadBookings();
}

function renderAdminBookings() {
  const listEl = document.getElementById("admin-bookings-list");
  if (!listEl) return;
  
  listEl.innerHTML = "";
  
  if (state.bookings.length === 0) {
    listEl.innerHTML = `<p class="no-bookings">Nenhum agendamento cadastrado.</p>`;
    return;
  }
  
  // Ordena por data e hora (mais próximos primeiro)
  const sorted = [...state.bookings].sort((a, b) => {
    const dateA = a.Data + "T" + a.Horario;
    const dateB = b.Data + "T" + b.Horario;
    return dateA.localeCompare(dateB);
  });
  
  // Separar em Pendentes e Outros
  const pendentes = sorted.filter(b => b.Status === "Pendente");
  const confirmados = sorted.filter(b => b.Status === "Confirmado");
  const cancelados = sorted.filter(b => b.Status === "Cancelado");
  
  // Renderizar pendentes primeiro
  if (pendentes.length > 0) {
    listEl.appendChild(createAdminSectionHeader("Pendentes (" + pendentes.length + ")"));
    pendentes.forEach(b => listEl.appendChild(createBookingAdminRow(b)));
  }
  
  if (confirmados.length > 0) {
    listEl.appendChild(createAdminSectionHeader("Confirmados"));
    confirmados.forEach(b => listEl.appendChild(createBookingAdminRow(b)));
  }
  
  if (cancelados.length > 0) {
    listEl.appendChild(createAdminSectionHeader("Cancelados"));
    cancelados.forEach(b => listEl.appendChild(createBookingAdminRow(b)));
  }
}

function createAdminSectionHeader(title) {
  const header = document.createElement("div");
  header.className = "admin-list-header";
  header.innerText = title;
  return header;
}

function createBookingAdminRow(booking) {
  const row = document.createElement("div");
  row.className = `admin-booking-row status-${booking.Status.toLowerCase()}`;
  
  const [year, month, day] = booking.Data.split("-");
  const formattedDate = `${day}/${month}`;
  
  const isPendente = booking.Status === "Pendente";
  const isConfirmado = booking.Status === "Confirmado";
  
  // Formatar telefone para link wa.me
  const linkPhone = booking.WhatsApp.startsWith("55") ? booking.WhatsApp : "55" + booking.WhatsApp;
  
  // Templates de mensagens
  const confirmMessage = encodeURIComponent(`Olá ${booking.Cliente}! Aqui é o Rogério Alves. Seu horário para o serviço de Cabelo e Bigode no dia ${formattedDate} às ${booking.Horario} está CONFIRMADO! 💈 Nos vemos lá!`);
  const cancelMessage = encodeURIComponent(`Olá ${booking.Cliente}, aqui é o Rogério Alves. Infelizmente precisei cancelar/reajustar o horário das ${booking.Horario} do dia ${formattedDate}. Por favor, acesse nosso site para agendar outro horário ou responda essa mensagem para alinharmos. Desculpe o transtorno.`);
  
  row.innerHTML = `
    <div class="booking-row-info">
      <span class="booking-row-time">📅 ${formattedDate} - ⏰ ${booking.Horario}</span>
      <span class="booking-row-name">${booking.Cliente}</span>
      <a href="https://wa.me/${linkPhone}" target="_blank" class="booking-row-phone">📲 WhatsApp: ${formatPhoneDisplay(booking.WhatsApp)}</a>
      <span class="booking-row-status badge-${booking.Status.toLowerCase()}">${booking.Status}</span>
    </div>
    <div class="booking-row-actions">
      ${isPendente ? `
        <button type="button" class="btn-action btn-confirm" onclick="updateStatus('${booking.ID}', 'Confirmado', 'https://wa.me/${linkPhone}?text=${confirmMessage}')">Confirmar</button>
        <button type="button" class="btn-action btn-cancel" onclick="updateStatus('${booking.ID}', 'Cancelado', 'https://wa.me/${linkPhone}?text=${cancelMessage}')">Cancelar</button>
      ` : ''}
      ${isConfirmado ? `
        <button type="button" class="btn-action btn-cancel" onclick="updateStatus('${booking.ID}', 'Cancelado', 'https://wa.me/${linkPhone}?text=${cancelMessage}')">Cancelar</button>
      ` : ''}
      ${booking.Status === "Cancelado" ? `
        <span class="action-done">Cancelado</span>
      ` : ''}
    </div>
  `;
  
  return row;
}

// 6. FUNÇÃO PARA ATUALIZAR STATUS NO BD E ENVIAR WHATSAPP
async function updateStatus(id, newStatus, whatsappUrl) {
  try {
    showLoading(true);
    
    if (state.sheetUrl && !id.startsWith("mock-")) {
      const response = await fetch(state.sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "updateStatus",
          id: id,
          status: newStatus
        })
      });
      const result = await response.json();
      
      if (result.status !== "success") {
        throw new Error(result.message);
      }
    } else {
      // Mock local update
      const localBookings = JSON.parse(localStorage.getItem(CONFIG.localStorageKey) || "[]");
      const index = localBookings.findIndex(b => b.ID === id);
      if (index !== -1) {
        localBookings[index].Status = newStatus;
        localStorage.setItem(CONFIG.localStorageKey, JSON.stringify(localBookings));
      }
    }
    
    // Atualizar estado e view localmente
    const stateIndex = state.bookings.findIndex(b => b.ID === id);
    if (stateIndex !== -1) {
      state.bookings[stateIndex].Status = newStatus;
    }
    
    renderAdminBookings();
    
    // Abrir o WhatsApp para enviar a notificação ao cliente
    if (whatsappUrl) {
      window.open(whatsappUrl, "_blank");
    }
    
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    alert("Erro ao atualizar o status do agendamento.");
  } finally {
    showLoading(false);
  }
}

// Expõe a função updateStatus para o escopo global (usada no onclick)
window.updateStatus = updateStatus;

// 7. EVENT LISTENERS & HELPERS
function setupEventListeners() {
  // Formulário de agendamento
  const form = document.getElementById("booking-form");
  if (form) {
    form.addEventListener("submit", handleBookingSubmit);
  }
  
  // Botões do Modal de sucesso
  const closeModalBtn = document.getElementById("close-modal-btn");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      document.getElementById("success-modal").style.display = "none";
    });
  }
  
  // Abrir Admin (Duplo clique na logo ou link do footer)
  const logo = document.getElementById("logo-title");
  if (logo) {
    logo.addEventListener("dblclick", () => toggleAdminPanel(true));
  }
  
  const footerAdminLink = document.getElementById("footer-admin-link");
  if (footerAdminLink) {
    footerAdminLink.addEventListener("click", (e) => {
      e.preventDefault();
      toggleAdminPanel(true);
    });
  }
  
  const closeAdminBtn = document.getElementById("close-admin-btn");
  if (closeAdminBtn) {
    closeAdminBtn.addEventListener("click", () => toggleAdminPanel(false));
  }
  
  const saveSheetBtn = document.getElementById("save-sheet-btn");
  if (saveSheetBtn) {
    saveSheetBtn.addEventListener("click", saveSheetUrl);
  }
  
  const editSheetBtn = document.getElementById("edit-sheet-btn");
  if (editSheetBtn) {
    editSheetBtn.addEventListener("click", () => {
      if (confirm("⚠️ AVISO DE SEGURANÇA:\n\nAlterar este link incorretamente fará o site parar de funcionar.\n\nDeseja mesmo liberar o campo para edição?")) {
        const urlInput = document.getElementById("sheet-url-input");
        if (urlInput) {
          urlInput.disabled = false;
          urlInput.type = "text";
          urlInput.focus();
        }
        editSheetBtn.style.display = "none";
        const saveBtn = document.getElementById("save-sheet-btn");
        if (saveBtn) saveBtn.style.display = "block";
      }
    });
  }
  
  // Fechar admin clicando fora
  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) {
    adminPanel.addEventListener("click", (e) => {
      if (e.target === adminPanel) {
        toggleAdminPanel(false);
      }
    });
  }
}

// Helpers de formatação
function formatDateYYYYMMDD(date) {
  const d = new Date(date);
  let month = "" + (d.getMonth() + 1);
  let day = "" + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
}

function formatDateShort(date) {
  const d = new Date(date);
  let day = "" + d.getDate();
  let month = "" + (d.getMonth() + 1);
  
  if (day.length < 2) day = "0" + day;
  if (month.length < 2) month = "0" + month;
  
  return `${day}/${month}`;
}

function getDayNameShort(date) {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return days[date.getDay()];
}

function formatPhoneDisplay(phone) {
  // Limpar formatação
  let clean = phone.replace(/\D/g, "");
  // Remover código do país se houver 55 no início e tiver 12 ou 13 dígitos
  if (clean.startsWith("55") && clean.length > 10) {
    clean = clean.slice(2);
  }
  
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return clean;
}
