import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, KeyRound, Mail } from 'lucide-react';
import Logo from '../components/Logo';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Automatically redirect to login after successful registration
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ flexDirection: 'column', paddingBottom: '10vh' }}>
      
      {/* Header outside the card */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div style={{ 
          filter: 'drop-shadow(0 0 40px rgba(0, 112, 243, 0.6))', 
          backgroundColor: 'rgba(0, 112, 243, 0.05)', 
          padding: '1.25rem', 
          borderRadius: '20px',
          border: '1px solid rgba(0, 112, 243, 0.2)',
          marginBottom: '1.5rem' 
        }}>
          <Logo size={72} />
        </div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '0.75rem', letterSpacing: '-0.04em' }}>CronaFlow</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.5rem' }}>Resilient Distributed Task Scheduler</p>
      </div>

      <div className="card auth-card" style={{ padding: '3.5rem', backgroundColor: '#111111', border: '1px solid #27272a', borderRadius: '24px', maxWidth: '700px' }}>
        {error && (
          <div style={{ padding: '1rem', backgroundColor: 'var(--danger-color)', color: 'white', borderRadius: 'var(--radius-md)', marginBottom: '2rem', fontSize: '1.25rem' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <label className="label" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#a1a1aa' }}>Name</label>
            <input 
              type="text" 
              className="input-field" 
              style={{ padding: '1.5rem 2rem', fontSize: '1.5rem', backgroundColor: '#000000', border: '1px solid #27272a', borderRadius: '12px' }} 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="label" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#a1a1aa' }}>Email</label>
            <input 
              type="email" 
              className="input-field" 
              style={{ padding: '1.5rem 2rem', fontSize: '1.5rem', backgroundColor: '#000000', border: '1px solid #27272a', borderRadius: '12px' }} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#a1a1aa' }}>Password</label>
            <input 
              type="password" 
              className="input-field" 
              style={{ padding: '1.5rem 2rem', fontSize: '1.5rem', backgroundColor: '#000000', border: '1px solid #27272a', borderRadius: '12px', letterSpacing: '0.1em' }} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', fontSize: '1.75rem', padding: '1.5rem', borderRadius: '12px' }} disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '1.25rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
            <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500' }}>Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
