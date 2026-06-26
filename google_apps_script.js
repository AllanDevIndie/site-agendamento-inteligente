/**
 * 8. Clique em "Implantar". Autorize as permissões se solicitado (clique em "Avançado" -> "Ir para..." se aparecer tela de aviso do Google).
 * 9. Copie o "URL do app da Web" gerado e insira-o no campo de configuração no painel administrativo do site.
 */

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }
  
  var response = ContentService.createTextOutput(JSON.stringify({ status: "success", data: rows }))
    .setMimeType(ContentService.MimeType.JSON);
  
  return addCorsHeaders(response);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var result = { status: "error", message: "Ação não especificada" };
  
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    if (action === "add") {
      var id = Utilities.getUuid();
      var clientName = payload.name;
      var whatsapp = payload.phone;
      var date = payload.date; // formato YYYY-MM-DD
      var time = payload.time; // formato HH:MM
      var status = "Pendente";
      var createdAt = new Date();
      
      sheet.appendRow([id, clientName, whatsapp, date, time, status, createdAt]);
      result = { status: "success", message: "Agendamento registrado com sucesso!", bookingId: id };
      
    } else if (action === "updateStatus") {
      var bookingId = payload.id;
      var newStatus = payload.status; // "Confirmado" ou "Cancelado"
      
      var data = sheet.getDataRange().getValues();
      var found = false;
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === bookingId) {
          // A coluna Status é a 6ª coluna (índice 5, já que ID é coluna 1 / índice 0)
          sheet.getRange(i + 1, 6).setValue(newStatus);
          found = true;
          break;
        }
      }
      
      if (found) {
        result = { status: "success", message: "Status atualizado para " + newStatus };
      } else {
        result = { status: "error", message: "Agendamento não encontrado" };
      }
    }
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  
  var response = ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
    
  return addCorsHeaders(response);
}

// Helper para lidar com as permissões de acesso (CORS) caso necessário
function addCorsHeaders(response) {
  // Apps Script Web Apps já possuem cabeçalhos padrão do Google, mas configuramos aqui para garantir
  return response;
}
