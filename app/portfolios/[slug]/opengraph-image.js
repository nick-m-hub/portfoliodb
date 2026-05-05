import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPortfolio } from '@/lib/db';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const RISK_LABELS = ['', 'Very Low', 'Low', 'Moderate', 'High', 'Very High'];

export default async function Image({ params }) {
  const { slug } = await params;
  const portfolio = await getPortfolio(slug);

  const fontBold = readFileSync(join(process.cwd(), 'public/fonts/Manrope-Bold.ttf'));
  const fontExtraBold = readFileSync(join(process.cwd(), 'public/fonts/Manrope-ExtraBold.ttf'));
  const fonts = [
    { name: 'Manrope', data: fontBold, weight: 700 },
    { name: 'Manrope', data: fontExtraBold, weight: 800 },
  ];

  if (!portfolio) {
    return new ImageResponse(
      <div style={{
        display: 'flex', width: '100%', height: '100%',
        backgroundColor: '#074a34', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Manrope',
      }}>
        <span style={{ color: '#ffffff', fontSize: 48, fontWeight: 800 }}>PortfolioDB</span>
      </div>,
      { ...size, fonts }
    );
  }

  const cagr = portfolio.cagr != null ? `${portfolio.cagr.toFixed(1)}%` : '—';
  const sharpe = portfolio.sharpe_ratio != null ? portfolio.sharpe_ratio.toFixed(2) : '—';
  const maxDD = portfolio.max_drawdown != null ? `${Math.abs(portfolio.max_drawdown).toFixed(1)}%` : '—';
  const risk = portfolio.risk_level ? RISK_LABELS[portfolio.risk_level] : null;

  return new ImageResponse(
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100%', height: '100%',
      backgroundColor: '#074a34', padding: '56px 60px',
      fontFamily: 'Manrope',
    }}>
      {/* Brand — top */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 21, fontWeight: 700, letterSpacing: '0.02em' }}>
          PortfolioDB
        </span>
      </div>

      {/* Name + badges + stats — pushed to bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>

        {/* Portfolio name */}
        <span style={{
          color: '#ffffff', fontSize: 60, fontWeight: 800,
          lineHeight: 1.1, letterSpacing: '-0.01em',
        }}>
          {portfolio.name}
        </span>

        {/* Category + risk badges */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, gap: 12 }}>
          {portfolio.category && (
            <span style={{
              color: '#074a34', backgroundColor: 'rgba(255,255,255,0.88)',
              padding: '5px 14px', borderRadius: 20,
              fontSize: 17, fontWeight: 700,
            }}>
              {portfolio.category}
            </span>
          )}
          {risk && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 17, fontWeight: 700 }}>
              {risk} Risk
            </span>
          )}
        </div>

        {/* Stat boxes */}
        <div style={{ display: 'flex', gap: 16, marginTop: 32, width: '100%' }}>
          {[
            { label: 'CAGR', value: cagr },
            { label: 'Sharpe Ratio', value: sharpe },
            { label: 'Max Drawdown', value: `-${maxDD}` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              backgroundColor: 'rgba(255,255,255,0.09)',
              borderRadius: 14, padding: '20px 24px',
            }}>
              <span style={{
                color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10,
              }}>
                {label}
              </span>
              <span style={{ color: '#ffffff', fontSize: 42, fontWeight: 800, lineHeight: 1 }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    { ...size, fonts }
  );
}
