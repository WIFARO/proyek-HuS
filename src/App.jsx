import { useState, useEffect } from "react"
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis
} from "recharts"

const API = "/.netlify/functions/transaksi"

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka)
}

const KATEGORI_CONFIG = {
  makan:     { icon: "🍔", warna: "#f97316" },
  transport: { icon: "🚗", warna: "#3b82f6" },
  belanja:   { icon: "🛍️", warna: "#a855f7" },
  tagihan:   { icon: "💡", warna: "#eab308" },
  hiburan:   { icon: "🎮", warna: "#ec4899" },
  lainnya:   { icon: "📦", warna: "#6b7280" },
}

function App() {
  const [transaksi, setTransaksi] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState("form")
  const [form, setForm] = useState({
    keterangan: "",
    nominal: "",
    tipe: "pengeluaran",
    kategori: "makan",
    tanggal: new Date().toISOString().split("T")[0],
  })

  // Ambil data dari Google Sheets saat pertama load
  useEffect(() => {
    fetchTransaksi()
  }, [])

  async function fetchTransaksi() {
    setLoading(true)
    try {
      const res = await fetch(API)
      const data = await res.json()
      setTransaksi(data.reverse()) // terbaru di atas
    } catch (err) {
      console.error("Gagal fetch:", err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const baru = {
        id: Date.now(),
        ...form,
        nominal: Number(form.nominal),
      }
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baru),
      })
      setTransaksi([baru, ...transaksi])
      setForm({
        keterangan: "",
        nominal: "",
        tipe: "pengeluaran",
        kategori: "makan",
        tanggal: new Date().toISOString().split("T")[0],
      })
    } catch (err) {
      alert("Gagal menyimpan, coba lagi!")
    } finally {
      setSaving(false)
    }
  }

  async function hapusTransaksi(id) {
    if (!confirm("Hapus transaksi ini?")) return
    try {
      await fetch(API, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      setTransaksi(transaksi.filter((t) => t.id !== id))
    } catch (err) {
      alert("Gagal menghapus, coba lagi!")
    }
  }

  const totalMasuk  = transaksi.filter(t => t.tipe === "pemasukan").reduce((a, t) => a + t.nominal, 0)
  const totalKeluar = transaksi.filter(t => t.tipe === "pengeluaran").reduce((a, t) => a + t.nominal, 0)
  const saldo = totalMasuk - totalKeluar

  const dataGrafik = Object.entries(
    transaksi
      .filter(t => t.tipe === "pengeluaran")
      .reduce((acc, t) => {
        acc[t.kategori] = (acc[t.kategori] || 0) + t.nominal
        return acc
      }, {})
  ).map(([kategori, total]) => ({
    name: `${KATEGORI_CONFIG[kategori]?.icon} ${kategori}`,
    value: total,
    warna: KATEGORI_CONFIG[kategori]?.warna || "#6b7280",
  }))

  const sekarang = new Date()
  const bulanIni = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, "0")}`
  const dataHarian = Object.entries(
    transaksi
      .filter(t => t.tipe === "pengeluaran" && t.tanggal.startsWith(bulanIni))
      .reduce((acc, t) => {
        const tgl = t.tanggal.split("-")[2]
        acc[tgl] = (acc[tgl] || 0) + t.nominal
        return acc
      }, {})
  )
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([tgl, total]) => ({ tgl, total }))

  const styleTab = (aktif) => ({
    flex: 1, padding: "10px", border: "none",
    borderBottom: aktif ? "2px solid #4f46e5" : "2px solid transparent",
    backgroundColor: "transparent",
    color: aktif ? "#4f46e5" : "#aaa",
    fontWeight: aktif ? "bold" : "normal",
    cursor: "pointer", fontSize: "14px",
  })

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "24px" }}>
      <h1>💰 Dompetku</h1>

      {/* Saldo */}
      <div style={{
        backgroundColor: saldo >= 0 ? "#1a3a2a" : "#3a1a1a",
        borderRadius: "12px", padding: "16px",
        marginBottom: "24px", textAlign: "center"
      }}>
        <div style={{ fontSize: "13px", color: "#aaa" }}>Saldo</div>
        {loading ? (
          <div style={{ color: "#aaa", padding: "8px" }}>Memuat data...</div>
        ) : (
          <>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: saldo >= 0 ? "#4ade80" : "#f87171" }}>
              {formatRupiah(saldo)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: "12px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#aaa" }}>Pemasukan</div>
                <div style={{ color: "#4ade80" }}>{formatRupiah(totalMasuk)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#aaa" }}>Pengeluaran</div>
                <div style={{ color: "#f87171" }}>{formatRupiah(totalKeluar)}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", marginBottom: "24px", borderBottom: "1px solid #333" }}>
        <button style={styleTab(tab === "form")}    onClick={() => setTab("form")}>✏️ Catat</button>
        <button style={styleTab(tab === "riwayat")} onClick={() => setTab("riwayat")}>📋 Riwayat</button>
        <button style={styleTab(tab === "grafik")}  onClick={() => setTab("grafik")}>📊 Grafik</button>
      </div>

      {/* Tab: Form */}
      {tab === "form" && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label>Keterangan</label><br />
            <input name="keterangan" value={form.keterangan} onChange={handleChange}
              placeholder="Contoh: Beli makan siang" required
              style={{ width: "100%", padding: "8px", marginTop: "4px", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label>Nominal (Rp)</label><br />
            <input name="nominal" type="number" value={form.nominal} onChange={handleChange}
              placeholder="Contoh: 25000" required
              style={{ width: "100%", padding: "8px", marginTop: "4px", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <div style={{ flex: 1 }}>
              <label>Tipe</label><br />
              <select name="tipe" value={form.tipe} onChange={handleChange}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}>
                <option value="pengeluaran">Pengeluaran</option>
                <option value="pemasukan">Pemasukan</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Kategori</label><br />
              <select name="kategori" value={form.kategori} onChange={handleChange}
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}>
                {Object.entries(KATEGORI_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {key}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label>Tanggal</label><br />
            <input name="tanggal" type="date" value={form.tanggal} onChange={handleChange} required
              style={{ width: "100%", padding: "8px", marginTop: "4px", boxSizing: "border-box" }} />
          </div>
          <button type="submit" disabled={saving} style={{
            width: "100%", padding: "12px", backgroundColor: saving ? "#333" : "#4f46e5",
            color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: saving ? "not-allowed" : "pointer"
          }}>
            {saving ? "Menyimpan..." : "Simpan Transaksi"}
          </button>
        </form>
      )}

      {/* Tab: Riwayat */}
      {tab === "riwayat" && (
        <div>
          <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>
            Riwayat Transaksi ({transaksi.length})
          </h2>
          {loading && <p style={{ color: "#aaa", textAlign: "center" }}>Memuat...</p>}
          {!loading && transaksi.length === 0 && (
            <p style={{ color: "#aaa", textAlign: "center" }}>Belum ada transaksi</p>
          )}
          {transaksi.map((t) => (
            <div key={t.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px", marginBottom: "8px", backgroundColor: "#1e1e2e",
              borderRadius: "8px", borderLeft: `4px solid ${t.tipe === "pemasukan" ? "#4ade80" : "#f87171"}`
            }}>
              <div>
                <div style={{ fontWeight: "bold" }}>
                  {KATEGORI_CONFIG[t.kategori]?.icon} {t.keterangan}
                </div>
                <div style={{ fontSize: "12px", color: "#aaa" }}>{t.tanggal} · {t.kategori}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: "bold", color: t.tipe === "pemasukan" ? "#4ade80" : "#f87171" }}>
                  {t.tipe === "pemasukan" ? "+" : "-"}{formatRupiah(t.nominal)}
                </div>
                <button onClick={() => hapusTransaksi(t.id)} style={{
                  fontSize: "11px", color: "#aaa", background: "none",
                  border: "none", cursor: "pointer", marginTop: "4px"
                }}>🗑 hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Grafik */}
      {tab === "grafik" && (
        <div>
          <h2 style={{ fontSize: "16px", marginBottom: "16px" }}>Pengeluaran per Kategori</h2>
          {dataGrafik.length === 0 ? (
            <p style={{ color: "#aaa", textAlign: "center" }}>Belum ada data pengeluaran</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={dataGrafik} cx="50%" cy="50%" outerRadius={100}
                    dataKey="value" label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {dataGrafik.map((entry, i) => (
                      <Cell key={i} fill={entry.warna} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatRupiah(val)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ marginTop: "16px" }}>
                {dataGrafik.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "8px 12px", marginBottom: "6px",
                    backgroundColor: "#1e1e2e", borderRadius: "8px",
                    borderLeft: `4px solid ${item.warna}`
                  }}>
                    <span>{item.name}</span>
                    <span style={{ fontWeight: "bold", color: "#f87171" }}>
                      {formatRupiah(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 style={{ fontSize: "16px", margin: "32px 0 16px" }}>Pengeluaran Harian Bulan Ini</h2>
          {dataHarian.length === 0 ? (
            <p style={{ color: "#aaa", textAlign: "center" }}>Belum ada data bulan ini</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dataHarian} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <XAxis dataKey="tgl" tick={{ fill: "#aaa", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#aaa", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(val) => formatRupiah(val)} labelFormatter={(l) => `Tgl ${l}`}
                  contentStyle={{ backgroundColor: "#1e1e2e", border: "none", borderRadius: "8px" }} />
                <Bar dataKey="total" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}

export default App