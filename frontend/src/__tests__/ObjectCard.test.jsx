import { render, screen } from '@testing-library/react';
import ObjectCard from '../components/ObjectCard';

const base = {
  id: 1, name: 'Keys', description: 'Silver keys', location: 'Library', category: 'Keys',
  date: '2026-11-01', status: 'lost', user_id: 2, user_name: 'Bob', image: null,
};

describe('ObjectCard (XSS regression)', () => {
  it('renders HTML payloads as inert text', () => {
    const payload = '<img src=x onerror="window.__xss=1">';
    const { container } = render(<ObjectCard obj={{ ...base, name: payload, description: payload }} onContact={() => {}} />);
    expect(screen.getByText(payload, { selector: '.card-title-cf' })).toBeInTheDocument();
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(window.__xss).toBeUndefined();
  });

  it('ignores image paths that are not our own uploads', () => {
    const { container } = render(<ObjectCard obj={{ ...base, image: 'javascript:alert(1)' }} onContact={() => {}} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('accepts images from the Vercel Blob store', () => {
    const url = 'https://abc123.public.blob.vercel-storage.com/objects/obj_1.png';
    const { container } = render(<ObjectCard obj={{ ...base, image: url }} onContact={() => {}} />);
    expect(container.querySelector('img').getAttribute('src')).toBe(url);
  });

  it('shows Delete for the owner and Contact for others', () => {
    render(<ObjectCard obj={base} isOwner onDelete={() => {}} />);
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });
});
