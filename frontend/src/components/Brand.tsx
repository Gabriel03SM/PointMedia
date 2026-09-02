import { Link } from 'react-router-dom';
import pointLogo from '../assets/point-logo.png';
import pointLogoLight from '../assets/point-logo-light.png';

export function Brand({ onDark = false }: { onDark?: boolean }) {
  return <Link className="brand" to="/" aria-label="Point Media"><img src={onDark ? pointLogoLight : pointLogo} alt="Point" /></Link>;
}
