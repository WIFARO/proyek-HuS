const { google } = require("googleapis")

const SPREADSHEET_ID = process.env.SPREADSHEET_ID
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS)

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
  return google.sheets({ version: "v4", auth })
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  }

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" }
  }

  try {
    const sheets = await getSheets()

    // GET — ambil semua transaksi
    if (event.httpMethod === "GET") {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A2:F",
      })
      const rows = res.data.values || []
      const data = rows.map(([id, keterangan, nominal, tipe, kategori, tanggal]) => ({
        id: Number(id),
        keterangan,
        nominal: Number(nominal),
        tipe,
        kategori,
        tanggal,
      }))
      return {
        statusCode: 200, headers,
        body: JSON.stringify(data),
      }
    }

    // POST — tambah transaksi baru
    if (event.httpMethod === "POST") {
      const { id, keterangan, nominal, tipe, kategori, tanggal } = JSON.parse(event.body)
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A:F",
        valueInputOption: "RAW",
        requestBody: {
          values: [[id, keterangan, nominal, tipe, kategori, tanggal]],
        },
      })
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    // DELETE — hapus transaksi by id
    if (event.httpMethod === "DELETE") {
      const { id } = JSON.parse(event.body)

      // Ambil semua data dulu
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A2:F",
      })
      const rows = res.data.values || []
      const rowIndex = rows.findIndex((r) => Number(r[0]) === Number(id))

      if (rowIndex === -1) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) }
      }

      // Hapus row yang ketemu (rowIndex + 2 karena header di row 1)
      const sheetId = 0
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex + 1,
                endIndex: rowIndex + 2,
              },
            },
          }],
        },
      })
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

  } catch (err) {
    console.error(err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}