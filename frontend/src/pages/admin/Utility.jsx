import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Droplets,
  FileText,
  Home,
  Info,
  LoaderCircle,
  Save,
  Search,
  Settings2,
  X,
  Zap,
} from "lucide-react";

const API = "http://localhost:4000/api";

const currentPeriod = () => new Date().toISOString().slice(0, 7);
const money = (value) =>
  Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const hasValue = (value) =>
  value !== "" &&
  value !== null &&
  value !== undefined &&
  String(value).trim() !== "";
const isNonNegativeNumber = (value) =>
  hasValue(value) && Number.isFinite(Number(value)) && Number(value) >= 0;
const meterPrevious = (value) => (hasValue(value) ? Number(value) : 0);
const meterCurrent = (value) => (hasValue(value) ? String(value) : "");
const rateValue = (value, fallback = "") =>
  hasValue(value) ? String(value) : fallback;

function periodLabel(period) {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function shiftPeriod(period, offset) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthOptions(selectedPeriod) {
  const selectedYear = Number(selectedPeriod.slice(0, 4));
  const thisYear = new Date().getFullYear();
  const firstYear = Math.min(2020, selectedYear, thisYear - 2);
  const lastYear = Math.max(selectedYear, thisYear + 4);
  const periods = [];

  for (let year = firstYear; year <= lastYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      periods.push(`${year}-${String(month).padStart(2, "0")}`);
    }
  }

  return periods;
}

function calculateRoom(room, rate) {
  const waterPrevious = Number(room.waterPrevious);
  const electricPrevious = Number(room.electricPrevious);
  const waterCurrent = Number(room.waterCurrent);
  const electricCurrent = Number(room.electricCurrent);
  const metersFilled =
    hasValue(room.waterCurrent) && hasValue(room.electricCurrent);
  const metersValid =
    metersFilled &&
    [waterPrevious, electricPrevious, waterCurrent, electricCurrent].every(
      Number.isFinite,
    ) &&
    waterPrevious >= 0 &&
    electricPrevious >= 0 &&
    waterCurrent >= waterPrevious &&
    electricCurrent >= electricPrevious;
  const ratesValid = [rate.waterRate, rate.electricRate, rate.commonFee].every(
    isNonNegativeNumber,
  );
  const waterUnits = metersValid ? waterCurrent - waterPrevious : 0;
  const electricUnits = metersValid ? electricCurrent - electricPrevious : 0;
  const waterAmount = waterUnits * (ratesValid ? Number(rate.waterRate) : 0);
  const electricAmount =
    electricUnits * (ratesValid ? Number(rate.electricRate) : 0);
  const commonFee = ratesValid ? Number(rate.commonFee) : 0;

  return {
    metersFilled,
    metersValid,
    ratesValid,
    ready: metersValid && ratesValid,
    waterUnits,
    electricUnits,
    waterAmount,
    electricAmount,
    commonFee,
    total:
      Number(room.rent_amount || 0) + waterAmount + electricAmount + commonFee,
  };
}

function meterError(value, previous) {
  if (!hasValue(value)) return "กรุณากรอกเลขมิเตอร์";
  if (!isNonNegativeNumber(value)) return "ต้องเป็นเลขศูนย์หรือมากกว่า";
  if (Number(value) < Number(previous)) return "ต้องไม่น้อยกว่าเลขก่อน";
  return "";
}

function statusOf(room) {
  if (room.room_status === "maintenance") return "maintenance";
  return room.tenant_id || room.room_status === "occupied"
    ? "occupied"
    : "available";
}

function StatusPill({ room }) {
  const status = statusOf(room);
  const labels = {
    occupied: "มีผู้พัก",
    available: "ว่าง",
    maintenance: "ซ่อมบำรุง",
  };
  return (
    <span className={`utility-dashboard__status is-${status}`}>
      {labels[status]}
    </span>
  );
}

function MeterInput({
  label,
  roomNumber,
  value,
  previous,
  disabled,
  onChange,
  showError,
}) {
  const error = showError ? meterError(value, previous) : "";
  return (
    <label className="utility-dashboard__meter-input">
      <span className="sr-only">
        {label} ห้อง {roomNumber}
      </span>
      <input
        aria-label={`${label} ห้อง ${roomNumber}`}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        min="0"
        step="any"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <small>{error}</small>}
    </label>
  );
}

function CalculationDetail({ room, calculation, rate, isSaved }) {
  const waterUnits = isSaved
    ? Number(room.water_units || 0)
    : calculation.waterUnits;
  const electricUnits = isSaved
    ? Number(room.electric_units || 0)
    : calculation.electricUnits;
  const waterAmount = isSaved
    ? Number(room.water_amount || 0)
    : calculation.waterAmount;
  const electricAmount = isSaved
    ? Number(room.electric_amount || 0)
    : calculation.electricAmount;
  const commonFee = isSaved
    ? Number(room.common_fee || 0)
    : Number(rate.commonFee || 0);
  const total = isSaved ? Number(room.total_amount || 0) : calculation.total;

  return (
    <div className="utility-dashboard__calculation">
      <span>
        ค่าเช่า <b>฿{money(room.rent_amount)}</b>
      </span>
      <span>
        ค่าน้ำ {waterUnits} หน่วย <b>฿{money(waterAmount)}</b>
      </span>
      <span>
        ค่าไฟ {electricUnits} หน่วย <b>฿{money(electricAmount)}</b>
      </span>
      <span>
        ค่าส่วนกลาง <b>฿{money(commonFee)}</b>
      </span>
      <span className="utility-dashboard__calculation-total">
        รวมสุทธิ <b>฿{money(total)}</b>
      </span>
    </div>
  );
}

function pageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const values = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...values]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);
  const items = [];
  let previous = 0;

  sorted.forEach((value) => {
    if (previous && value - previous > 1) items.push(`gap-${previous}`);
    items.push(value);
    previous = value;
  });

  return items;
}

export default function Utility() {
  const [period, setPeriod] = useState(currentPeriod);
  const [rate, setRate] = useState({
    waterRate: "",
    electricRate: "",
    commonFee: "200",
  });
  const [rooms, setRooms] = useState([]);
  const [dirty, setDirty] = useState(new Set());
  const [rateDirty, setRateDirty] = useState(false);
  const [rateNeedsSaving, setRateNeedsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [search, setSearch] = useState("");
  const [floor, setFloor] = useState("");
  const [status, setStatus] = useState("");
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [invoiceConfirmOpen, setInvoiceConfirmOpen] = useState(false);
  const [invoiceOutcome, setInvoiceOutcome] = useState(null);
  const loadRequest = useRef(0);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const request = async (url, options = {}) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      const roomErrors = Array.isArray(payload.errors)
        ? payload.errors
            .map(
              (item) =>
                `ห้อง ${item.roomNumber || item.roomId}: ${item.message}`,
            )
            .join(", ")
        : "";
      throw new Error(
        roomErrors || payload.message || "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ",
      );
    }

    return payload;
  };

  const showNotice = (message) => {
    setFailure("");
    setNotice(message);
  };

  const showFailure = (message) => {
    setNotice("");
    setFailure(message);
  };

  const load = async (nextPeriod = period) => {
    const requestId = loadRequest.current + 1;
    loadRequest.current = requestId;
    setLoading(true);
    setFailure("");

    try {
      const response = await request(`${API}/admin/utility/${nextPeriod}`, {
        headers: authHeaders(),
      });
      if (requestId !== loadRequest.current) return;
      const savedRate = response.data.rate;
      setRate({
        waterRate: rateValue(savedRate?.water_rate),
        electricRate: rateValue(savedRate?.electric_rate),
        commonFee: rateValue(savedRate?.common_fee, "200"),
      });
      setRateNeedsSaving(
        !savedRate || Boolean(response.data.rateCopiedFromPreviousPeriod),
      );
      setRateDirty(false);
      setRooms(
        response.data.rooms.map((room) => ({
          ...room,
          waterPrevious: meterPrevious(room.water_previous),
          waterCurrent: meterCurrent(room.water_current),
          electricPrevious: meterPrevious(room.electric_previous),
          electricCurrent: meterCurrent(room.electric_current),
        })),
      );
      setDirty(new Set());
      setExpandedRoom(null);

      if (response.data.rateCopiedFromPreviousPeriod) {
        showNotice(
          "ระบบนำอัตราล่าสุดมาเป็นค่าเริ่มต้นแล้ว กรุณาบันทึกอัตราสำหรับรอบเดือนนี้ก่อนบันทึกมิเตอร์",
        );
      }
    } catch (error) {
      if (requestId !== loadRequest.current) return;
      showFailure(error.message);
    } finally {
      if (requestId === loadRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    // Start the API synchronization after this render has committed.
    void Promise.resolve().then(() => load());
    // The selected billing period is deliberately the only reload trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const hasUnsavedChanges = dirty.size > 0 || rateDirty;

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const floors = useMemo(
    () =>
      [
        ...new Set(
          rooms
            .map((room) => room.floor)
            .filter(
              (value) => value !== null && value !== undefined && value !== "",
            ),
        ),
      ].sort((a, b) => Number(a) - Number(b)),
    [rooms],
  );

  const filteredRooms = useMemo(
    () =>
      rooms.filter((room) => {
        const matchesSearch =
          !search || String(room.room_number).includes(search.trim());
        const matchesFloor = !floor || String(room.floor) === floor;
        const matchesStatus = !status || statusOf(room) === status;
        return matchesSearch && matchesFloor && matchesStatus;
      }),
    [rooms, search, floor, status],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const shownRooms = filteredRooms.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const firstRoom = filteredRooms.length ? (activePage - 1) * pageSize + 1 : 0;
  const lastRoom = Math.min(activePage * pageSize, filteredRooms.length);
  const rateIsComplete = [
    rate.waterRate,
    rate.electricRate,
    rate.commonFee,
  ].every(isNonNegativeNumber);
  const readyRooms = rooms.filter(
    (room) => room.tenant_id && room.reading_id && !room.invoice_id,
  );
  const incompleteRooms = rooms.filter(
    (room) => room.tenant_id && !room.reading_id,
  );
  const estimatedTotal = readyRooms.reduce(
    (sum, room) => sum + Number(room.total_amount || 0),
    0,
  );
  const months = useMemo(() => buildMonthOptions(period), [period]);

  const updateMeter = (roomId, key, value) => {
    setRooms((current) =>
      current.map((room) =>
        room.room_id === roomId ? { ...room, [key]: value } : room,
      ),
    );
    setDirty((current) => new Set(current).add(roomId));
    setInvoiceOutcome(null);
  };

  const changePeriod = (nextPeriod) => {
    if (nextPeriod === period) return;
    if (
      hasUnsavedChanges &&
      !window.confirm("มีข้อมูลที่ยังไม่ได้บันทึก ต้องการเปลี่ยนเดือนหรือไม่?")
    )
      return;
    loadRequest.current += 1;
    setLoading(true);
    setNotice("");
    setFailure("");
    setInvoiceOutcome(null);
    setRooms([]);
    setDirty(new Set());
    setRateDirty(false);
    setRateNeedsSaving(false);
    setExpandedRoom(null);
    setPeriod(nextPeriod);
    setPage(1);
  };

  const changeFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const saveRates = async () => {
    if (dirty.size) {
      showFailure(
        "กรุณาบันทึกข้อมูลมิเตอร์ที่แก้ไขอยู่ก่อนเปลี่ยนอัตราค่าใช้จ่าย",
      );
      return;
    }
    if (!rateIsComplete) {
      showFailure(
        "กรุณากรอกค่าน้ำ ค่าไฟ และค่าส่วนกลางเป็นเลขศูนย์หรือมากกว่า",
      );
      return;
    }

    try {
      setSaving(true);
      const response = await request(`${API}/admin/utility/${period}/rates`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(rate),
      });
      await load(period);
      showNotice(response.message);
    } catch (error) {
      showFailure(error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveMeters = async () => {
    const changedRooms = rooms.filter((room) => dirty.has(room.room_id));

    if (!changedRooms.length) {
      showNotice("ยังไม่มีข้อมูลมิเตอร์ที่แก้ไข");
      return;
    }
    if (!rateIsComplete || rateNeedsSaving || rateDirty) {
      showFailure("กรุณาบันทึกอัตราค่าใช้จ่ายของรอบเดือนนี้ก่อนบันทึกมิเตอร์");
      return;
    }

    const invalidRoom = changedRooms.find(
      (room) => !calculateRoom(room, rate).ready,
    );
    if (invalidRoom) {
      showFailure(
        `ห้อง ${invalidRoom.room_number}: กรุณากรอกมิเตอร์น้ำและไฟให้ครบ และต้องไม่น้อยกว่าเลขก่อน`,
      );
      return;
    }

    try {
      setSaving(true);
      const response = await request(
        `${API}/admin/utility/${period}/readings`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            readings: changedRooms.map((room) => ({
              roomId: room.room_id,
              roomNumber: room.room_number,
              waterPrevious: Number(room.waterPrevious),
              waterCurrent: Number(room.waterCurrent),
              electricPrevious: Number(room.electricPrevious),
              electricCurrent: Number(room.electricCurrent),
            })),
          }),
        },
      );
      await load(period);
      showNotice(response.message);
    } catch (error) {
      showFailure(error.message);
    } finally {
      setSaving(false);
    }
  };

  const issueInvoices = async () => {
    setInvoiceConfirmOpen(false);

    if (hasUnsavedChanges) {
      showFailure("กรุณาบันทึกอัตราและข้อมูลมิเตอร์ก่อนออกใบแจ้งหนี้");
      return;
    }
    if (!readyRooms.length) {
      showFailure("ยังไม่มีห้องที่พร้อมออกใบแจ้งหนี้ในรอบเดือนนี้");
      return;
    }

    try {
      setSaving(true);
      const response = await request(
        `${API}/admin/utility/${period}/invoices`,
        {
          method: "POST",
          headers: authHeaders(),
          body: "{}",
        },
      );
      setInvoiceOutcome({
        issued: Number(response.issued || 0),
        skipped: response.skipped || [],
      });
      await load(period);
      showNotice(response.message);
    } catch (error) {
      showFailure(error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderTotal = (room, calculation) => {
    const saved = Boolean(room.reading_id) && !dirty.has(room.room_id);
    if (saved) return <b>฿{money(room.total_amount)}</b>;
    if (calculation.ready) return <b>฿{money(calculation.total)}</b>;
    return (
      <span className="utility-dashboard__incomplete-total">รอกรอกมิเตอร์</span>
    );
  };

  const renderCommonFee = (room) =>
    room.reading_id && !dirty.has(room.room_id)
      ? money(room.common_fee)
      : rateIsComplete
        ? money(rate.commonFee)
        : "—";

  return (
    <main className="utility-dashboard">
      <header className="utility-dashboard__header">
        <header className="admin-payment-heading">
        <div className="page" data-p="ad-dashboard">
        <div className="page-head">
          <div className="eyebrow">ค่าน้ำ ค่าไฟ และค่าส่วนกลาง</div>

          <h2>จัดการค่าน้ำ ค่าไฟ และค่าส่วนกลาง</h2>

          <p>บันทึกมิเตอร์และออกใบแจ้งหนี้ของแต่ละห้อง</p>
        </div>
      </div>
      </header>

        <section
          className="utility-dashboard__period"
          aria-label="เลือกเดือนและปี"
        >
          <label htmlFor="utility-period">
            <CalendarDays aria-hidden="true" size={18} />
            เลือกเดือนและปี
          </label>
          <div>
            <button
              type="button"
              aria-label="เดือนก่อนหน้า"
              disabled={loading || saving}
              onClick={() => changePeriod(shiftPeriod(period, -1))}
            >
              <ChevronLeft size={20} />
            </button>
            <select
              id="utility-period"
              disabled={loading || saving}
              value={period}
              onChange={(event) => changePeriod(event.target.value)}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {periodLabel(month)}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="เดือนถัดไป"
              disabled={loading || saving}
              onClick={() => changePeriod(shiftPeriod(period, 1))}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </section>
      </header>

      {notice && (
        <p className="utility-dashboard__message is-success" role="status">
          <CheckCircle2 aria-hidden="true" size={17} />
          {notice}
        </p>
      )}
      {failure && (
        <p className="utility-dashboard__message is-error" role="alert">
          <AlertTriangle aria-hidden="true" size={17} />
          {failure}
        </p>
      )}

      <section
        className="utility-dashboard__card utility-dashboard__rates"
        aria-labelledby="utility-rates-heading"
      >
        <div className="utility-dashboard__section-heading">
          <span className="utility-dashboard__heading-icon">
            <Settings2 aria-hidden="true" size={25} />
          </span>
          <h2 id="utility-rates-heading">อัตราค่าใช้จ่าย (บาท)</h2>
        </div>
        <div className="utility-dashboard__rate-fields">
          <label>
            <span className="utility-dashboard__field-icon is-water">
              <Droplets aria-hidden="true" size={20} />
            </span>
            <span>ค่าน้ำ (บาท/หน่วย)</span>
            <input
              aria-label="ค่าน้ำ บาทต่อหน่วย"
              disabled={loading || saving || dirty.size > 0}
              min="0"
              step="0.01"
              type="number"
              value={rate.waterRate}
              onChange={(event) => {
                setRate((current) => ({
                  ...current,
                  waterRate: event.target.value,
                }));
                setRateDirty(true);
              }}
            />
          </label>
          <label>
            <span className="utility-dashboard__field-icon is-electric">
              <Zap aria-hidden="true" size={20} />
            </span>
            <span>ค่าไฟ (บาท/หน่วย)</span>
            <input
              aria-label="ค่าไฟ บาทต่อหน่วย"
              disabled={loading || saving || dirty.size > 0}
              min="0"
              step="0.01"
              type="number"
              value={rate.electricRate}
              onChange={(event) => {
                setRate((current) => ({
                  ...current,
                  electricRate: event.target.value,
                }));
                setRateDirty(true);
              }}
            />
          </label>
          <label>
            <span className="utility-dashboard__field-icon is-common">
              <Building2 aria-hidden="true" size={20} />
            </span>
            <span>ค่าส่วนกลาง (บาท/ห้อง/เดือน)</span>
            <input
              aria-label="ค่าส่วนกลาง บาทต่อห้องต่อเดือน"
              disabled={loading || saving || dirty.size > 0}
              min="0"
              step="0.01"
              type="number"
              value={rate.commonFee}
              onChange={(event) => {
                setRate((current) => ({
                  ...current,
                  commonFee: event.target.value,
                }));
                setRateDirty(true);
              }}
            />
          </label>
          <button
            className="utility-dashboard__button utility-dashboard__button--blue"
            type="button"
            disabled={
              loading ||
              saving ||
              dirty.size > 0 ||
              (!rateDirty && !rateNeedsSaving)
            }
            onClick={saveRates}
          >
            {saving ? (
              <LoaderCircle className="utility-dashboard__spin" size={19} />
            ) : (
              <Save size={19} />
            )}
            บันทึกอัตราค่าใช้จ่าย
          </button>
        </div>
        <p className="utility-dashboard__rate-note">
          <Info aria-hidden="true" size={19} />
          <span>
            ระบบจะนำค่าอัตราล่าสุดมาเป็นค่าเริ่มต้นในเดือนถัดไป
            โดยไม่กระทบข้อมูลย้อนหลัง
          </span>
          {rateNeedsSaving && <b>กรุณาบันทึกอัตราก่อนกรอกมิเตอร์</b>}
        </p>
      </section>

      <section
        className="utility-dashboard__card utility-dashboard__meters"
        aria-labelledby="utility-meters-heading"
      >
        <div className="utility-dashboard__meter-top">
          <div className="utility-dashboard__section-heading utility-dashboard__section-heading--with-copy">
            <span className="utility-dashboard__heading-icon">
              <FileText aria-hidden="true" size={25} />
            </span>
            <div>
              <h2 id="utility-meters-heading">บันทึกมิเตอร์รายห้อง</h2>
              <p>กรอกเฉพาะมิเตอร์ใหม่ ระบบคำนวณค่าใช้จ่ายให้อัตโนมัติ</p>
            </div>
          </div>
          <div className="utility-dashboard__meter-controls">
            <label className="utility-dashboard__search">
              <Search aria-hidden="true" size={19} />
              <span className="sr-only">ค้นหาห้อง</span>
              <input
                value={search}
                placeholder="ค้นหาห้อง (เช่น 103)"
                onChange={(event) =>
                  changeFilter(setSearch, event.target.value)
                }
              />
            </label>
            <select
              aria-label="กรองตามชั้น"
              value={floor}
              onChange={(event) => changeFilter(setFloor, event.target.value)}
            >
              <option value="">ทุกชั้น</option>
              {floors.map((item) => (
                <option key={item} value={item}>
                  ชั้น {item}
                </option>
              ))}
            </select>
            <select
              aria-label="กรองตามสถานะห้อง"
              value={status}
              onChange={(event) => changeFilter(setStatus, event.target.value)}
            >
              <option value="">ทุกสถานะ</option>
              <option value="occupied">มีผู้พัก</option>
              <option value="available">ว่าง</option>
              <option value="maintenance">ซ่อมบำรุง</option>
            </select>
            <button
              className="utility-dashboard__button utility-dashboard__button--save"
              type="button"
              disabled={loading || saving || !dirty.size}
              onClick={saveMeters}
            >
              {saving ? (
                <LoaderCircle className="utility-dashboard__spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              บันทึกมิเตอร์
            </button>
          </div>
        </div>

        <div className="utility-dashboard__desktop-table">
          <table>
            <colgroup>
              <col className="utility-dashboard__col-room" />
              <col className="utility-dashboard__col-floor" />
              <col className="utility-dashboard__col-status" />
              <col className="utility-dashboard__col-rent" />
              <col className="utility-dashboard__col-meter" />
              <col className="utility-dashboard__col-meter-new" />
              <col className="utility-dashboard__col-meter" />
              <col className="utility-dashboard__col-meter-new" />
              <col className="utility-dashboard__col-common" />
              <col className="utility-dashboard__col-total" />
              <col className="utility-dashboard__col-detail" />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan="2">ห้อง</th>
                <th rowSpan="2">ชั้น</th>
                <th rowSpan="2">สถานะ</th>
                <th rowSpan="2">ค่าเช่า (฿)</th>
                <th colSpan="2" className="is-water">
                  <Droplets aria-hidden="true" size={18} />
                  มิเตอร์น้ำ
                </th>
                <th colSpan="2" className="is-electric">
                  <Zap aria-hidden="true" size={18} />
                  มิเตอร์ไฟ
                </th>
                <th rowSpan="2">
                  ค่าส่วนกลาง
                  <br />
                  (฿)
                </th>
                <th rowSpan="2" className="is-total">
                  ยอดรวม (฿)
                </th>
                <th rowSpan="2">รายละเอียด</th>
              </tr>
              <tr>
                <th>น้ำก่อน</th>
                <th>น้ำใหม่</th>
                <th>ไฟก่อน</th>
                <th>ไฟใหม่</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="11" className="utility-dashboard__loading">
                    <LoaderCircle
                      className="utility-dashboard__spin"
                      size={22}
                    />
                    กำลังโหลดข้อมูลห้องพัก…
                  </td>
                </tr>
              )}
              {!loading &&
                shownRooms.map((room) => {
                  const calculation = calculateRoom(room, rate);
                  const isSaved =
                    Boolean(room.reading_id) && !dirty.has(room.room_id);
                  const locked = Boolean(room.invoice_id);
                  const isExpanded = expandedRoom === room.room_id;
                  const showError = dirty.has(room.room_id);

                  return [
                    <tr
                      key={room.room_id}
                      className={locked ? "is-locked" : ""}
                    >
                      <td className="utility-dashboard__room">
                        <b>{room.room_number}</b>
                        {locked && <small>ออกบิลแล้ว</small>}
                      </td>
                      <td>{room.floor ?? "—"}</td>
                      <td>
                        <StatusPill room={room} />
                      </td>
                      <td className="utility-dashboard__money">
                        {money(room.rent_amount)}
                      </td>
                      <td className="utility-dashboard__previous">
                        {room.waterPrevious}
                      </td>
                      <td>
                        <MeterInput
                          label="มิเตอร์น้ำใหม่"
                          roomNumber={room.room_number}
                          value={room.waterCurrent}
                          previous={room.waterPrevious}
                          disabled={
                            loading || locked || rateDirty || rateNeedsSaving
                          }
                          showError={showError}
                          onChange={(value) =>
                            updateMeter(room.room_id, "waterCurrent", value)
                          }
                        />
                      </td>
                      <td className="utility-dashboard__previous">
                        {room.electricPrevious}
                      </td>
                      <td>
                        <MeterInput
                          label="มิเตอร์ไฟใหม่"
                          roomNumber={room.room_number}
                          value={room.electricCurrent}
                          previous={room.electricPrevious}
                          disabled={
                            loading || locked || rateDirty || rateNeedsSaving
                          }
                          showError={showError}
                          onChange={(value) =>
                            updateMeter(room.room_id, "electricCurrent", value)
                          }
                        />
                      </td>
                      <td className="utility-dashboard__money">
                        {renderCommonFee(room)}
                      </td>
                      <td className="utility-dashboard__total">
                        {renderTotal(room, calculation)}
                      </td>
                      <td>
                        <button
                          className="utility-dashboard__detail-button"
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={`ดูรายละเอียดห้อง ${room.room_number}`}
                          onClick={() =>
                            setExpandedRoom(isExpanded ? null : room.room_id)
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp size={20} />
                          ) : (
                            <ChevronDown size={20} />
                          )}
                        </button>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr
                        key={`${room.room_id}-detail`}
                        className="utility-dashboard__detail-row"
                      >
                        <td colSpan="11">
                          <CalculationDetail
                            room={room}
                            calculation={calculation}
                            rate={rate}
                            isSaved={isSaved}
                          />
                        </td>
                      </tr>
                    ),
                  ];
                })}
            </tbody>
          </table>
          {!loading && !shownRooms.length && (
            <div className="utility-dashboard__empty">
              ไม่พบห้องที่ตรงกับเงื่อนไขที่เลือก
            </div>
          )}
        </div>

        <div className="utility-dashboard__mobile-list">
          {loading && (
            <div className="utility-dashboard__loading">
              <LoaderCircle className="utility-dashboard__spin" size={22} />
              กำลังโหลดข้อมูลห้องพัก…
            </div>
          )}
          {!loading &&
            shownRooms.map((room) => {
              const calculation = calculateRoom(room, rate);
              const isSaved =
                Boolean(room.reading_id) && !dirty.has(room.room_id);
              const locked = Boolean(room.invoice_id);
              const isExpanded = expandedRoom === room.room_id;
              const showError = dirty.has(room.room_id);

              return (
                <article
                  key={room.room_id}
                  className="utility-dashboard__room-card"
                >
                  <header>
                    <div>
                      <b>ห้อง {room.room_number}</b>
                      <span>ชั้น {room.floor ?? "—"}</span>
                    </div>
                    <StatusPill room={room} />
                  </header>
                  <div className="utility-dashboard__room-rent">
                    <span>ค่าเช่า</span>
                    <b>฿{money(room.rent_amount)}</b>
                  </div>
                  {locked && (
                    <p className="utility-dashboard__locked-note">
                      ห้องนี้ออกใบแจ้งหนี้แล้ว จึงแก้ไขมิเตอร์ไม่ได้
                    </p>
                  )}
                  <div className="utility-dashboard__card-meters">
                    <div>
                      <span>น้ำก่อน</span>
                      <b>{room.waterPrevious}</b>
                    </div>
                    <div>
                      <span>น้ำใหม่</span>
                      <MeterInput
                        label="มิเตอร์น้ำใหม่"
                        roomNumber={room.room_number}
                        value={room.waterCurrent}
                        previous={room.waterPrevious}
                        disabled={
                          loading || locked || rateDirty || rateNeedsSaving
                        }
                        showError={showError}
                        onChange={(value) =>
                          updateMeter(room.room_id, "waterCurrent", value)
                        }
                      />
                    </div>
                    <div>
                      <span>ไฟก่อน</span>
                      <b>{room.electricPrevious}</b>
                    </div>
                    <div>
                      <span>ไฟใหม่</span>
                      <MeterInput
                        label="มิเตอร์ไฟใหม่"
                        roomNumber={room.room_number}
                        value={room.electricCurrent}
                        previous={room.electricPrevious}
                        disabled={
                          loading || locked || rateDirty || rateNeedsSaving
                        }
                        showError={showError}
                        onChange={(value) =>
                          updateMeter(room.room_id, "electricCurrent", value)
                        }
                      />
                    </div>
                  </div>
                  <div className="utility-dashboard__room-total">
                    <span>ค่าส่วนกลาง ฿{renderCommonFee(room)}</span>
                    <strong>{renderTotal(room, calculation)}</strong>
                  </div>
                  <button
                    className="utility-dashboard__mobile-detail"
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpandedRoom(isExpanded ? null : room.room_id)
                    }
                  >
                    ดูรายละเอียดการคำนวณ{" "}
                    {isExpanded ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </button>
                  {isExpanded && (
                    <CalculationDetail
                      room={room}
                      calculation={calculation}
                      rate={rate}
                      isSaved={isSaved}
                    />
                  )}
                </article>
              );
            })}
          {!loading && !shownRooms.length && (
            <div className="utility-dashboard__empty">
              ไม่พบห้องที่ตรงกับเงื่อนไขที่เลือก
            </div>
          )}
        </div>

        <footer className="utility-dashboard__pagination">
          <label>
            แสดง
            <select
              aria-label="จำนวนห้องต่อหน้า"
              value={pageSize}
              onChange={(event) =>
                changeFilter(setPageSize, Number(event.target.value))
              }
            >
              {[5, 10, 20].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            รายการต่อหน้า
          </label>
          <span>
            แสดง {firstRoom}–{lastRoom} จาก {filteredRooms.length} ห้อง
          </span>
          <nav aria-label="เปลี่ยนหน้ารายการห้อง">
            <button
              type="button"
              aria-label="หน้าก่อนหน้า"
              disabled={activePage === 1}
              onClick={() => setPage(activePage - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            {pageItems(activePage, totalPages).map((item) =>
              typeof item === "string" ? (
                <span key={item}>…</span>
              ) : (
                <button
                  type="button"
                  key={item}
                  className={item === activePage ? "is-active" : ""}
                  aria-current={item === activePage ? "page" : undefined}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              aria-label="หน้าถัดไป"
              disabled={activePage === totalPages}
              onClick={() => setPage(activePage + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </nav>
        </footer>
      </section>

      <section
        className="utility-dashboard__invoice"
        aria-labelledby="utility-invoice-heading"
      >
        <div className="utility-dashboard__invoice-heading">
          <span className="utility-dashboard__invoice-icon">
            <FileText aria-hidden="true" size={27} />
          </span>
          <div>
            <h2 id="utility-invoice-heading">ออกใบแจ้งหนี้</h2>
            <p>สร้างใบแจ้งหนี้สำหรับเดือน {periodLabel(period)}</p>
          </div>
        </div>
        <div className="utility-dashboard__invoice-stats">
          <article className="is-ready">
            <CheckCircle2 aria-hidden="true" size={23} />
            <div>
              <span>พร้อมออกใบแจ้งหนี้</span>
              <b>{readyRooms.length} ห้อง</b>
              <small>กรอกมิเตอร์และยังไม่ออกบิล</small>
            </div>
          </article>
          <article className="is-incomplete">
            <AlertTriangle aria-hidden="true" size={23} />
            <div>
              <span>กรอกมิเตอร์ไม่ครบ</span>
              <b>{incompleteRooms.length} ห้อง</b>
              <small>เฉพาะห้องที่มีผู้พัก</small>
            </div>
          </article>
          <article className="is-total">
            <Building2 aria-hidden="true" size={23} />
            <div>
              <span>ยอดรวมโดยประมาณ</span>
              <b>฿{money(estimatedTotal)}</b>
              <small>จากห้องที่พร้อมออกบิล</small>
            </div>
          </article>
        </div>
        <div className="utility-dashboard__invoice-action">
          <button
            type="button"
            className="utility-dashboard__button utility-dashboard__button--gold"
            disabled={
              loading || saving || !readyRooms.length || hasUnsavedChanges
            }
            onClick={() => setInvoiceConfirmOpen(true)}
          >
            {saving ? (
              <LoaderCircle className="utility-dashboard__spin" size={20} />
            ) : (
              <FileText size={20} />
            )}
            ออกใบแจ้งหนี้
            <ChevronRight size={19} />
          </button>
          <p>
            <Info aria-hidden="true" size={17} />
            จะออกใบแจ้งหนี้เฉพาะห้องที่มีข้อมูลครบ
            และยังไม่เคยออกใบแจ้งหนี้ในเดือนนี้
          </p>
        </div>
        {invoiceOutcome && (
          <p className="utility-dashboard__invoice-outcome">
            ออกใบแจ้งหนี้สำเร็จ {invoiceOutcome.issued} ห้อง
            {invoiceOutcome.skipped.length
              ? ` · ไม่สามารถออกได้ ${invoiceOutcome.skipped.map((item) => item.roomNumber || item.roomId).join(", ")}`
              : ""}
          </p>
        )}
      </section>

      {invoiceConfirmOpen && (
        <div
          className="utility-dashboard__modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setInvoiceConfirmOpen(false);
          }}
        >
          <section
            className="utility-dashboard__confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="utility-confirm-title"
          >
            <button
              type="button"
              className="utility-dashboard__close"
              aria-label="ปิดหน้าต่างยืนยัน"
              onClick={() => setInvoiceConfirmOpen(false)}
            >
              <X size={19} />
            </button>
            <FileText aria-hidden="true" size={28} />
            <h3 id="utility-confirm-title">ยืนยันการออกใบแจ้งหนี้</h3>
            <p>
              ระบบจะออกใบแจ้งหนี้สำหรับ {readyRooms.length} ห้อง รวมประมาณ ฿
              {money(estimatedTotal)} ประจำเดือน {periodLabel(period)}
            </p>
            <div>
              <button
                type="button"
                className="utility-dashboard__button utility-dashboard__button--gold"
                onClick={issueInvoices}
              >
                ยืนยันออกใบแจ้งหนี้
              </button>
              <button
                type="button"
                className="utility-dashboard__cancel"
                onClick={() => setInvoiceConfirmOpen(false)}
              >
                ยกเลิก
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
