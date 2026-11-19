
/**
 * SARBS Communications Ltd. - Inventory Hub Backend
 */

function doGet(e) {
  try {
    const transactions = getTransactions();
    const metadata = getMetadata();
    const admins = getAdmins();
    
    return createJSONOutput({ 
      status: 'success',
      transactions: transactions,
      employees: metadata.employees,
      tools: metadata.tools, 
      catalog: metadata.catalog,
      admins: admins
    });
    
  } catch (error) {
    console.error("Critical doGet Error: " + error.toString());
    return createJSONOutput({ status: 'error', message: error.toString() });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(20000); 
  
  try {
    const requestData = JSON.parse(e.postData.contents);
    const p = requestData.payload;
    
    if (requestData.action === 'addTransaction') {
      const sheet = getSheet("Daily Entry");
      sheet.appendRow([
        p.date,
        p.employeeId || '',
        p.employeeName || '',
        p.designation || '',
        p.department || '',
        p.typeOfEmployee || '',
        p.toolName,
        p.entryType,
        p.quantity,
        p.condition,
        p.remarks || ''
      ]);
      return createJSONOutput({ status: 'success' });
    }

    if (requestData.action === 'addEmployee') {
      const sheet = getSheet("Data Validation");
      const data = sheet.getDataRange().getDisplayValues();
      const targetId = String(p.id).trim().toUpperCase();
      
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toUpperCase() === targetId) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex !== -1) {
        // Update existing employee
        sheet.getRange(rowIndex, 2).setValue(p.name);
        sheet.getRange(rowIndex, 3).setValue(p.designation);
        sheet.getRange(rowIndex, 4).setValue(p.department);
        sheet.getRange(rowIndex, 5).setValue(p.typeOfEmployee || 'Running');
        return createJSONOutput({ status: 'success' });
      } else {
        // Add new employee
        sheet.appendRow([
          p.id, p.name, p.designation, p.department, p.typeOfEmployee || 'Running', '12345', '', ''
        ]);
        return createJSONOutput({ status: 'success' });
      }
    }

    if (requestData.action === 'deleteEmployee') {
      const sourceSheet = getSheet("Data Validation");
      const archiveSheet = getSheet("Discard Employee");
      const data = sourceSheet.getDataRange().getDisplayValues();
      const targetId = String(p.id).trim().toUpperCase();

      // Ensure archive sheet has headers if it's new/empty
      if (archiveSheet.getLastRow() < 1) {
        archiveSheet.appendRow(["ID", "NAME", "DESIGNATION", "DEPARTMENT", "STATUS", "PASSWORD", "DISCARD_DATE"]);
      }

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toUpperCase() === targetId) {
          const rowData = data[i];
          // Archive to "Discard Employee" tab
          archiveSheet.appendRow([
            rowData[0], // ID
            rowData[1], // Name
            rowData[2], // Designation
            rowData[3], // Department
            rowData[4], // Status
            rowData[5] || '12345', // Password
            new Date().toLocaleString() // Discard Date
          ]);
          // Remove from active directory
          sourceSheet.deleteRow(i + 1);
          return createJSONOutput({ status: 'success' });
        }
      }
      return createJSONOutput({ status: 'error', message: 'Personnel not found' });
    }

    if (requestData.action === 'addToolToCatalog') {
      const sheet = getSheet("Tools Name List");
      sheet.appendRow([p.name, p.brand || 'N/A', p.department || 'All']);
      return createJSONOutput({ status: 'success' });
    }

    if (requestData.action === 'updateToolInCatalog') {
      const sheet = getSheet("Tools Name List");
      const data = sheet.getDataRange().getDisplayValues();
      const oldName = String(p.oldName).trim().toLowerCase();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === oldName) {
          sheet.getRange(i + 1, 1, 1, 3).setValues([[p.name, p.brand || 'N/A', p.department || 'All']]);
          return createJSONOutput({ status: 'success' });
        }
      }
      return createJSONOutput({ status: 'error', message: 'Tool not found' });
    }

    if (requestData.action === 'updateEmployeeStatus') {
      const sheet = getSheet("Data Validation");
      const data = sheet.getDataRange().getDisplayValues();
      const targetId = String(p.id).trim().toUpperCase();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toUpperCase() === targetId) {
          sheet.getRange(i + 1, 5).setValue(p.status);
          return createJSONOutput({ status: 'success' });
        }
      }
      return createJSONOutput({ status: 'error', message: 'Employee not found' });
    }

    if (requestData.action === 'requestPasswordChange') {
      const sheet = getSheet("Data Validation");
      const data = sheet.getDataRange().getDisplayValues();
      const targetId = String(p.id).trim().toUpperCase();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toUpperCase() === targetId) {
          sheet.getRange(i + 1, 7).setValue(p.newPassword);
          return createJSONOutput({ status: 'success', message: 'Password change requested' });
        }
      }
      return createJSONOutput({ status: 'error', message: 'Employee not found' });
    }

    if (requestData.action === 'approvePasswordChange') {
      const sheet = getSheet("Data Validation");
      const data = sheet.getDataRange().getDisplayValues();
      const targetId = String(p.id).trim().toUpperCase();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toUpperCase() === targetId) {
          const reqPass = data[i][6];
          if (reqPass) {
            sheet.getRange(i + 1, 6).setValue(reqPass);
            sheet.getRange(i + 1, 7).setValue('');
            return createJSONOutput({ status: 'success' });
          }
          return createJSONOutput({ status: 'error', message: 'No pending password request' });
        }
      }
      return createJSONOutput({ status: 'error', message: 'Employee not found' });
    }

    if (requestData.action === 'upsertAdmin') {
      const sheet = getSheet("Admins");
      const data = sheet.getDataRange().getDisplayValues();
      const targetId = String(p.id).trim().toUpperCase();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toUpperCase() === targetId) { rowIndex = i + 1; break; }
      }
      const rowValues = [p.id, p.name, p.password, p.role, p.department, p.designation];
      if (rowIndex !== -1) sheet.getRange(rowIndex, 1, 1, 6).setValues([rowValues]);
      else sheet.appendRow(rowValues);
      return createJSONOutput({ status: 'success' });
    }

    if (requestData.action === 'deleteAdmin') {
      const sheet = getSheet("Admins");
      const data = sheet.getDataRange().getDisplayValues();
      const targetId = String(p.id).trim().toUpperCase();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toUpperCase() === targetId) {
          sheet.deleteRow(i + 1);
          return createJSONOutput({ status: 'success' });
        }
      }
      return createJSONOutput({ status: 'error', message: 'Admin not found' });
    }
    
    return createJSONOutput({ status: 'error', message: 'Unknown action: ' + requestData.action });
  } catch (error) {
    return createJSONOutput({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function getAdmins() {
  const sheet = getSheet("Admins");
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getDisplayValues().map(row => ({
    id: row[0], name: row[1], password: row[2], role: row[3], department: row[4], designation: row[5]
  })).filter(a => a.id);
}

function getTransactions() {
  const sheet = getSheet("Daily Entry");
  if (sheet.getLastRow() < 2) return [];
  return sheet.getDataRange().getDisplayValues().slice(1).map((row, index) => ({
    id: 'row-' + (index + 2),
    date: row[0], employeeId: row[1], employeeName: row[2], designation: row[3], department: row[4], typeOfEmployee: row[5], toolName: row[6], entryType: row[7], quantity: Number(row[8] || 0), condition: row[9], remarks: row[10]
  })).filter(t => t.employeeId);
}

function getMetadata() {
  const vSheet = getSheet("Data Validation");
  const cSheet = getSheet("Tools Name List");
  const employees = vSheet.getLastRow() < 2 ? [] : vSheet.getRange(2, 1, vSheet.getLastRow() - 1, 8).getDisplayValues().map(row => ({
    id: row[0], name: row[1], designation: row[2], department: row[3], typeOfEmployee: row[4], password: row[5] || '12345', passwordRequest: row[6]
  })).filter(e => e.id);
  const catalog = cSheet.getLastRow() < 2 ? [] : cSheet.getRange(2, 1, cSheet.getLastRow() - 1, 3).getDisplayValues().map(row => ({
    name: row[0], brand: row[1] || 'N/A', department: row[2] || 'All'
  })).filter(c => c.name);
  return { employees, catalog, tools: catalog.map(c => c.name) };
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === "Admins") sheet.appendRow(["ID", "Name", "Password", "Role", "Department", "Designation"]);
    else if (name === "Daily Entry") sheet.appendRow(["Date", "ID", "Name", "Designation", "Department", "Type", "Item Name", "Entry Type", "Quantity", "Condition", "Remarks"]);
    else if (name === "Data Validation") sheet.appendRow(["ID", "Name", "Designation", "Department", "Type of Employee", "Password", "Password Request", "Tool Name"]);
    else if (name === "Tools Name List") sheet.appendRow(["Tool Name", "Brand Name", "Department Access"]);
    else if (name === "Discard Employee") sheet.appendRow(["ID", "NAME", "DESIGNATION", "DEPARTMENT", "STATUS", "PASSWORD", "DISCARD_DATE"]);
  }
  return sheet;
}

function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
