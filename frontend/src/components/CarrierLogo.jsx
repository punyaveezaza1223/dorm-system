import { getCarrier } from '../constants/carriers';

export function CarrierLogo({ name }) {
  const carrier = getCarrier(name);

  if (!carrier) {
    return <span className="carrier-logo-fallback" aria-hidden="true">ขนส่ง</span>;
  }

  return (
    <img
      className="carrier-logo"
      src={carrier.logo}
      alt={`โลโก้ ${carrier.label}`}
    />
  );
}
