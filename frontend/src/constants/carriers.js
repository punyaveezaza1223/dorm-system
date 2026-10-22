import dhlLogo from '../assets/carriers/dhl.jpg';
import flashLogo from '../assets/carriers/flash.jpg';
import jtLogo from '../assets/carriers/jt.jpg';
import kexLogo from '../assets/carriers/kex.jpg';
import spxLogo from '../assets/carriers/spx.jpg';
import thailandPostLogo from '../assets/carriers/thailand-post.jpg';

export const OTHER_CARRIER = 'other';

export const CARRIERS = [
  { value: 'KEX Express', label: 'KEX Express', logo: kexLogo, aliases: ['kex', 'kerry express'] },
  { value: 'ไปรษณีย์ไทย', label: 'ไปรษณีย์ไทย', logo: thailandPostLogo, aliases: ['thailand post'] },
  { value: 'J&T Express', label: 'J&T Express', logo: jtLogo, aliases: ['j&t', 'j&t express', 'j and t'] },
  { value: 'DHL Express', label: 'DHL Express', logo: dhlLogo, aliases: ['dhl', 'dhl express'] },
  { value: 'Flash Express', label: 'Flash Express', logo: flashLogo, aliases: ['flash', 'flash express'] },
  { value: 'SPX Express', label: 'SPX Express', logo: spxLogo, aliases: ['spx', 'spx express', 'shopee express'] },
];

const normalizeCarrier = (name) => String(name || '').trim().toLowerCase();

export function getCarrier(name) {
  const normalizedName = normalizeCarrier(name);

  return CARRIERS.find((carrier) =>
    normalizeCarrier(carrier.value) === normalizedName ||
    carrier.aliases.some((alias) => alias === normalizedName),
  );
}
