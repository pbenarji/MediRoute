import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownUp, ArrowLeft, ArrowRight, BadgeCheck, BedDouble,
  CalendarCheck, Check, ChevronDown, ChevronRight, Clock3, Compass,
  HeartPulse, Hospital, LocateFixed, MapPin, Menu, Navigation, Plus,
  Search, ShieldCheck, SlidersHorizontal, Sparkles, Star, Stethoscope,
  UserRound, UsersRound, X, Zap
} from 'lucide-react';

const CITIES = ['All cities', 'Vijayawada', 'Mangalagiri', 'Gudivada', 'Eluru', 'Guntur'];

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Please try again.');
  return data;
}

function Stars({ value = 0, size = 15 }) {
  return <span className="stars" aria-label={`${value} out of 5 stars`}><Star size={size} fill="currentColor" strokeWidth={1.6} /> <b>{Number(value || 0).toFixed(1)}</b></span>;
}

function Brand() {
  return <div className="brand-lockup"><span className="brand-mark"><Activity size={21} strokeWidth={2.6} /></span><span>Medi<span>Route</span><small>CARE, MADE CLEAR</small></span></div>;
}

function App() {
  const [page, setPage] = useState('find');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [city, setCity] = useState('All cities');
  const [sort, setSort] = useState('distance');
  const [filters, setFilters] = useState({ emergency: false, rating: false, type: '', equipment: '', tag: '' });
  const [hospitals, setHospitals] = useState([]);
  const [detail, setDetail] = useState(null);
  const [profile, setProfile] = useState(null);
  const [live, setLive] = useState([]);
  const [liveUpdated, setLiveUpdated] = useState('');
  const [user, setUser] = useState(null);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [selectedMapHospital, setSelectedMapHospital] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', identifier: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [estimate, setEstimate] = useState([]);
  const [reviewForm, setReviewForm] = useState({ stars: 5, text: '' });
  const [reviewBusy, setReviewBusy] = useState(false);

  const loadHospitals = useCallback(async () => {
    const params = new URLSearchParams();
    if (submittedQuery) params.set('q', submittedQuery);
    if (city !== 'All cities') params.set('city', city);
    if (sort) params.set('sort', sort);
    if (filters.emergency) params.set('emergency', 'true');
    if (filters.rating) params.set('rating', 'true');
    if (filters.type) params.set('type', filters.type);
    if (filters.equipment) params.set('equipment', filters.equipment);
    if (filters.tag) params.set('tag', filters.tag);
    if (location) { params.set('lat', String(location.lat)); params.set('lng', String(location.lng)); }
    try {
      const result = await api(`/api/hospitals?${params.toString()}`);
      setHospitals(result.hospitals || []);
      setSelectedMapHospital((current) => result.hospitals?.find((h) => h.id === current?.id) || result.hospitals?.[0] || null);
    } catch (error) { setToast(error.message); }
  }, [submittedQuery, city, sort, filters, location]);

  const loadLive = useCallback(async () => {
    try {
      const result = await api('/api/hospitals/live');
      setLive(result.hospitals || []);
      setLiveUpdated(result.updatedAt || new Date().toISOString());
    } catch (error) { setToast(error.message); }
  }, []);

  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);

  useEffect(() => {
    api('/api/health').then((s) => { setDatabaseReady(s.persistent); setDemoMode(s.demoData); }).catch(() => {});
    api('/api/auth/me').then((s) => { setUser(s.user); setDatabaseReady(s.databaseReady); setDemoMode(s.demoMode); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (page !== 'live') return undefined;
    loadLive();
    const timer = window.setInterval(loadLive, 5000);
    return () => window.clearInterval(timer);
  }, [page, loadLive]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showDetail = async (hospital) => {
    try {
      const result = await api(`/api/hospitals/${hospital.id}`);
      setDetail(result);
      setEstimate([]);
      setPage('detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { setToast(error.message); }
  };

  const refreshDetail = async () => {
    if (!detail?.hospital?.id) return;
    const result = await api(`/api/hospitals/${detail.hospital.id}`);
    setDetail(result);
  };

  const openProfile = async () => {
    if (!user) { setAuthMode('login'); setAuthOpen(true); return; }
    try {
      const result = await api('/api/me/profile');
      setProfile(result);
      setPage('profile');
    } catch (error) { setToast(error.message); }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) { setToast('Location is not available in this browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocation({ lat: coords.latitude, lng: coords.longitude }); setLocating(false); setToast('Showing hospitals near your location.'); },
      () => { setLocating(false); setToast('Location permission was not granted. Showing Vijayawada results.'); },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setAuthError(''); setBusy(true);
    try {
      const route = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const result = await api(route, { method: 'POST', body: JSON.stringify(authForm) });
      setUser(result.user); setDatabaseReady(result.databaseReady); setDemoMode(result.demoMode);
      setAuthOpen(false); setAuthForm({ name: '', identifier: '', password: '' });
      setToast(result.demoMode ? 'Signed in in temporary demo mode.' : `Welcome, ${result.user.name}.`);
      if (page === 'profile') {
        const profileResult = await api('/api/me/profile');
        setProfile(profileResult);
      }
      if (page === 'detail') await refreshDetail();
    } catch (error) { setAuthError(error.message); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    setUser(null); setProfile(null); setPage('find'); setToast('You have signed out.');
  };

  const markVisit = async () => {
    if (!user) { setAuthMode('login'); setAuthOpen(true); return; }
    try {
      await api(`/api/hospitals/${detail.hospital.id}/visit`, { method: 'POST' });
      await refreshDetail(); setToast('Visit added to your profile.');
    } catch (error) { setToast(error.message); }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!user) { setAuthMode('login'); setAuthOpen(true); return; }
    setReviewBusy(true);
    try {
      await api(`/api/hospitals/${detail.hospital.id}/reviews`, { method: 'POST', body: JSON.stringify(reviewForm) });
      setReviewForm({ stars: 5, text: '' }); await refreshDetail(); setToast('Thanks for sharing your feedback.');
    } catch (error) { setToast(error.message); }
    finally { setReviewBusy(false); }
  };

  const removeReview = async () => {
    try { await api(`/api/hospitals/${detail.hospital.id}/reviews`, { method: 'DELETE' }); await refreshDetail(); setToast('Your review was deleted.'); }
    catch (error) { setToast(error.message); }
  };

  const navTo = (target) => { setPage(target); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const heading = useMemo(() => ({ find: 'Find care', live: 'Live care view', profile: 'Your activity', detail: 'Hospital profile' })[page] || 'Find care', [page]);
  const mapHospital = selectedMapHospital || hospitals[0];
  const mapLat = mapHospital?.lat || 16.506;
  const mapLng = mapHospital?.lng || 80.648;
  const mapDelta = 0.055;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - mapDelta}%2C${mapLat - mapDelta}%2C${mapLng + mapDelta}%2C${mapLat + mapDelta}&layer=mapnik&marker=${mapLat}%2C${mapLng}`;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top"><Brand /><button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X size={19} /></button></div>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        <button className={page === 'find' || page === 'detail' ? 'active' : ''} onClick={() => navTo('find')}><Compass size={18} /><span>Find care</span><ChevronRight className="nav-chevron" size={15} /></button>
        <button className={page === 'live' ? 'active' : ''} onClick={() => navTo('live')}><Activity size={18} /><span>Live beds</span><i className="live-dot" /></button>
        <button className={page === 'profile' ? 'active' : ''} onClick={openProfile}><UserRound size={18} /><span>My activity</span></button>
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-help"><div className="help-icon"><HeartPulse size={19} /></div><b>Need urgent help?</b><p>This demo is not an emergency service. Call your local emergency number.</p><a href="https://112.gov.in/" target="_blank" rel="noreferrer">Emergency information <ArrowRight size={14} /></a></div>
      <div className="sidebar-user">
        <span className="avatar">{user?.name?.[0]?.toUpperCase() || 'G'}</span>
        <div className="sidebar-user-copy"><b>{user?.name || 'Guest mode'}</b><small>{user ? 'Personal account' : 'Browse without signing in'}</small></div>
        {user ? <button className="more-button" aria-label="Sign out" onClick={signOut}><ChevronDown size={16} /></button> : <button className="side-signin" onClick={() => { setAuthMode('login'); setAuthOpen(true); }}>Sign in</button>}
      </div>
    </aside>

    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="main-area">
      <header className="topbar">
        <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
        <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><b>{heading}</b></div>
        <div className="topbar-actions">
          <span className={`connection-pill ${databaseReady ? 'connected' : ''}`}><i />{databaseReady ? 'Database connected' : 'Demo mode'}</span>
          {user ? <button className="top-avatar" onClick={openProfile} aria-label="Open profile">{user.name?.[0]?.toUpperCase()}</button> : <button className="button button-outline small-signin" onClick={() => { setAuthMode('login'); setAuthOpen(true); }}>Sign in</button>}
        </div>
      </header>

      <div className="demo-ribbon"><Sparkles size={14} /><span><b>Project demo</b> · Hospital directory, prices, reviews and bed availability use sample data. Not for medical or emergency decisions.</span><button onClick={() => setToast('MediRoute is a college project demo. Always verify provider details directly.')}>Learn more</button></div>

      {page === 'find' && <section className="content-wrap">
        <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-mark"><HeartPulse size={14} /></span> A clearer way to find care</div><h1>Find care that feels<br className="desktop-break" /> closer to <span>home.</span></h1><p className="lead">Explore local hospitals, compare services and plan your next step with confidence.</p></div><div className="welcome-art" aria-hidden="true"><div className="art-glow" /><div className="art-cross"><Plus size={53} strokeWidth={3.1} /></div><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-mini-card"><span><MapPin size={14} /></span><div><b>Care nearby</b><small>Browse the demo directory</small></div><Check size={15} /></div></div></div>

        <form className="search-panel" onSubmit={(e) => { e.preventDefault(); setSubmittedQuery(query.trim()); }}>
          <div className="search-input-wrap"><Search size={20} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Describe a need or search a specialty" aria-label="Search by symptom or specialty" /><span className="search-hint">Try “heart”, “fracture”</span></div>
          <div className="search-divider" />
          <label className="city-picker"><MapPin size={18} /><select value={city} onChange={(e) => setCity(e.target.value)} aria-label="Choose city">{CITIES.map((name) => <option key={name} value={name}>{name === 'All cities' ? 'Choose city' : name}</option>)}</select><ChevronDown size={15} /></label>
          <button className="button button-primary search-submit" type="submit">Search <ArrowRight size={16} /></button>
        </form>
        <div className="location-note"><span><LocateFixed size={15} /></span>{location ? 'Using your location for distance estimates.' : 'Distance is estimated from Vijayawada until you share your location.'}<button onClick={requestLocation} disabled={locating}>{locating ? 'Finding you…' : location ? 'Update location' : 'Use my location'}</button></div>

        <div className="quick-stats">
          <div className="quick-stat"><span className="stat-icon mint"><Hospital size={18} /></span><div><b>{hospitals.length || 12}</b><small>sample hospitals</small></div></div>
          <div className="stat-separator" />
          <div className="quick-stat"><span className="stat-icon lilac"><MapPin size={18} /></span><div><b>5</b><small>cities covered</small></div></div>
          <div className="stat-separator" />
          <div className="quick-stat"><span className="stat-icon peach"><ShieldCheck size={18} /></span><div><b>Demo</b><small>directory status</small></div></div>
          <div className="stats-caption"><span className="tiny-live" /> Directory preview</div>
        </div>

        <div className="section-heading-row"><div><div className="eyebrow muted">YOUR SHORTLIST STARTS HERE</div><h2>Hospitals near you <span className="result-count">{hospitals.length}</span></h2></div><label className="sort-select"><ArrowDownUp size={15} /><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort hospitals"><option value="distance">Nearest first</option><option value="rating">Highest rated</option><option value="reviews">Most reviewed</option></select><ChevronDown size={14} /></label></div>

        <div className="filter-row"><span className="filter-label"><SlidersHorizontal size={15} /> Filters</span>
          <button className={`filter-chip ${filters.emergency ? 'selected' : ''}`} onClick={() => setFilters({ ...filters, emergency: !filters.emergency })}><Zap size={14} />Emergency + ICU</button>
          <button className={`filter-chip ${filters.rating ? 'selected' : ''}`} onClick={() => setFilters({ ...filters, rating: !filters.rating })}><Star size={14} />4.0+ sample score</button>
          <select className="filter-select" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} aria-label="Hospital ownership"><option value="">All ownership</option><option value="Government">Government</option><option value="Private">Private</option></select>
          <select className="filter-select" value={filters.equipment} onChange={(e) => setFilters({ ...filters, equipment: e.target.value })} aria-label="Equipment filter"><option value="">Any equipment</option><option>ICU</option><option>CT</option><option>MRI</option><option>X-RAY</option></select>
          <select className="filter-select" value={filters.tag} onChange={(e) => setFilters({ ...filters, tag: e.target.value })} aria-label="Specialty filter"><option value="">All specialties</option><option>Multispeciality</option><option>Children</option><option>Maternity</option><option>Eye</option><option>Dental</option></select>
          {(filters.emergency || filters.rating || filters.type || filters.equipment || filters.tag || submittedQuery || city !== 'All cities') && <button className="clear-filters" onClick={() => { setFilters({ emergency: false, rating: false, type: '', equipment: '', tag: '' }); setSubmittedQuery(''); setQuery(''); setCity('All cities'); }}>Clear</button>}
        </div>

        <div className="results-layout">
          <div className="hospital-list">
            {hospitals.length ? hospitals.map((hospital, index) => <HospitalCard key={hospital.id} hospital={hospital} number={index + 1} selected={selectedMapHospital?.id === hospital.id} onSelect={() => setSelectedMapHospital(hospital)} onOpen={() => showDetail(hospital)} />) : <div className="empty-state"><span className="empty-icon"><Search size={23} /></span><h3>No matches yet</h3><p>Try another search or clear a filter to browse the full demo directory.</p><button className="button button-outline" onClick={() => { setFilters({ emergency: false, rating: false, type: '', equipment: '', tag: '' }); setSubmittedQuery(''); setQuery(''); setCity('All cities'); }}>Reset search</button></div>}
          </div>
          <aside className="map-card"><div className="map-card-head"><div><b><MapPin size={15} /> Explore the area</b><small>{mapHospital?.city || 'Vijayawada'} · sample map pin</small></div><button className="icon-button map-action" aria-label="Open map in a new tab" onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${mapLat}&mlon=${mapLng}#map=14/${mapLat}/${mapLng}`, '_blank', 'noopener,noreferrer')}><ArrowUpRightIcon /></button></div><div className="map-frame"><iframe title="OpenStreetMap demo location" src={mapUrl} loading="lazy" referrerPolicy="no-referrer" /><div className="map-demo-tag"><span /> Sample location</div></div><div className="map-selected"><div className="map-pin-icon"><MapPin size={16} /></div><div><b>{mapHospital?.name || 'Choose a hospital'}</b><small>{mapHospital ? `${mapHospital.distanceKm?.toFixed(1) || '—'} km · ${mapHospital.city}` : 'Select a result to preview'}</small></div></div><button className="map-open-link" onClick={() => mapHospital && showDetail(mapHospital)}>View selected hospital <ArrowRight size={15} /></button></aside>
        </div>
      </section>}

      {page === 'live' && <section className="content-wrap live-page"><div className="page-title-block"><div className="eyebrow"><span className="pulse-indicator" /> LIVE DEMO FEED</div><h1>Bed availability,<br /><span>at a glance.</span></h1><p className="lead">A simulated snapshot of ICU beds and emergency wait times. This feed is for demonstrating the interface only.</p></div><div className="live-summary"><div className="live-big-icon"><Activity size={23} /></div><div><small>LAST SIMULATED UPDATE</small><b>{liveUpdated ? new Date(liveUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Updating…'}</b></div><span className="live-refresh"><i /> Refreshing every 5 seconds</span></div><div className="live-grid">{live.map((row) => <article key={row.id} className="live-card"><div className="live-card-top"><span className="hospital-mark"><Hospital size={17} /></span><span className="simulated-badge">SIMULATED</span></div><h3>{row.name}</h3><p><MapPin size={14} />{row.city}</p><div className="live-metrics"><div className="bed-metric"><BedDouble size={18} /><span><b>{row.availableBeds}</b><small>sample beds</small></span></div><div className="wait-metric"><Clock3 size={18} /><span><b>{row.erWait} min</b><small>sample ER wait</small></span></div></div><button className="text-action" onClick={() => { const found = hospitals.find((h) => h.id === row.id); if (found) showDetail(found); else api(`/api/hospitals/${row.id}`).then((r) => { setDetail(r); setPage('detail'); }); }}>View hospital <ArrowRight size={15} /></button></article>)}</div></section>}

      {page === 'detail' && detail && <section className="content-wrap detail-page"><button className="back-link" onClick={() => navTo('find')}><ArrowLeft size={16} /> Back to hospital search</button><div className="detail-banner"><div className="detail-banner-icon"><Hospital size={28} /></div><div className="detail-banner-copy"><div className="detail-eyebrow"><span>{detail.hospital.type}</span><span>·</span><span>{detail.hospital.city}</span>{detail.hospital.emergency && <span className="emergency-label"><Zap size={12} /> Emergency service listed</span>}</div><h1>{detail.hospital.name}</h1><p><MapPin size={15} />{detail.hospital.address} <span className="sample-inline">· Sample entry</span></p><div className="detail-meta"><Stars value={detail.hospital.rating} /><span>{detail.hospital.reviewCount} sample reviews</span><i /> <span>{detail.hospital.distanceKm ? `${detail.hospital.distanceKm.toFixed(1)} km from search point` : detail.hospital.city}</span></div></div><a className="button button-primary direction-button" href={`https://www.google.com/maps/dir/?api=1&destination=${detail.hospital.lat},${detail.hospital.lng}`} target="_blank" rel="noreferrer"><Navigation size={16} /> Get directions</a></div>
        <div className="detail-caution"><ShieldCheck size={16} /><span>Directory details, location, ratings, costs and emergency listings are sample data. Verify every detail with the provider. Do not use this demo to make urgent care decisions.</span></div>
        <div className="detail-grid"><div className="detail-main-col"><section className="detail-section"><div className="detail-section-title"><div><div className="eyebrow muted">CARE & CAPABILITIES</div><h2>What this hospital lists</h2></div><span className="sample-tag">SAMPLE DATA</span></div><div className="specialty-chips">{detail.hospital.specialties.map((s) => <span key={s}><Stethoscope size={14} />{s}</span>)}</div><div className="equipment-grid">{detail.hospital.equipment.map((e) => <div key={e} className="equipment-item"><Check size={15} /><span>{e}</span></div>)}</div></section>
        <section className="detail-section"><div className="detail-section-title"><div><div className="eyebrow muted">ESTIMATED COSTS</div><h2>Plan an estimate</h2></div><span className="estimate-total">₹{estimate.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN')}</span></div><p className="section-subcopy">Tap services to add them to your estimate. Sample prices only; the provider may charge differently.</p><div className="price-list">{detail.hospital.prices.map((item) => { const active = estimate.some((selected) => selected.label === item.label); return <button key={item.label} className={`price-row ${active ? 'price-active' : ''}`} onClick={() => setEstimate(active ? estimate.filter((s) => s.label !== item.label) : [...estimate, item])}><span className="price-add">{active ? <Check size={15} /> : <Plus size={15} />}</span><span>{item.label}</span><b>₹{item.amount.toLocaleString('en-IN')}</b></button>; })}</div>{estimate.length > 0 && <button className="clear-estimate" onClick={() => setEstimate([])}>Clear estimate</button>}</section>
        <section className="detail-section doctor-section"><div className="detail-section-title"><div><div className="eyebrow muted">CARE TEAM PREVIEW</div><h2>Listed specialists</h2></div><span className="sample-tag">SAMPLE DATA</span></div><div className="doctor-list">{detail.hospital.doctors.map((doctor) => <article className="doctor-card" key={doctor.name}><div className="doctor-avatar">{doctor.name.split(' ').filter(Boolean).slice(1).join(' ').slice(0, 1) || 'D'}</div><div className="doctor-info"><b>{doctor.name}</b><span>{doctor.specialty}</span><small>{doctor.qualification} · {doctor.years} yrs</small><small>{doctor.languages?.join(' · ')}</small></div><div className="doctor-fee">₹{doctor.fee}<small>sample fee</small></div></article>)}</div></section>
        <section className="detail-section review-section"><div className="detail-section-title"><div><div className="eyebrow muted">COMMUNITY NOTES</div><h2>Reviews <span className="result-count">{detail.reviews.length}</span></h2></div></div>{detail.ownReview ? <div className="own-review"><div className="review-row-head"><b>Your review</b><Stars value={detail.ownReview.stars} /><button className="link-danger" onClick={removeReview}>Delete</button></div><p>{detail.ownReview.text}</p></div> : user ? <form className="review-form" onSubmit={submitReview}><label>Your star rating<select value={reviewForm.stars} onChange={(e) => setReviewForm({ ...reviewForm, stars: Number(e.target.value) })}>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}</select></label><textarea value={reviewForm.text} onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })} maxLength={400} placeholder="Share a short note about your experience" required minLength={3} /><button className="button button-primary" disabled={reviewBusy}>{reviewBusy ? 'Saving…' : 'Post review'}</button></form> : <div className="sign-in-nudge"><UsersRound size={19} /><span>Sign in to save a visit or leave a review.</span><button onClick={() => { setAuthMode('login'); setAuthOpen(true); }}>Sign in</button></div>}{detail.reviews.length ? <div className="review-list">{detail.reviews.map((review) => <article className="review-card" key={review.id}><div className="review-row-head"><b>{review.name}</b><Stars value={review.stars} /></div><p>{review.text}</p><small>{new Date(review.createdAt).toLocaleDateString()}</small></article>)}</div> : <p className="no-reviews">No member reviews yet. Sample score above is part of the demo directory.</p>}</section></div>
        <aside className="detail-side-col"><div className="visit-card"><div className="visit-icon"><CalendarCheck size={20} /></div><h3>Keep track of your visits</h3><p>Save this hospital to your profile after a visit. This is a self-reported check-in.</p><div className="visit-count"><UsersRound size={16} /><b>{detail.visitCount}</b><span>visits on your profile</span></div><button className="button button-primary full-width" onClick={markVisit}>{user ? 'I visited here' : 'Sign in to continue'} <ArrowRight size={15} /></button></div><div className="side-map-card"><div className="side-map-head"><b><MapPin size={15} /> Location preview</b><span>DEMO</span></div><iframe title="Hospital location sample map" src={`https://www.openstreetmap.org/export/embed.html?bbox=${detail.hospital.lng - 0.035}%2C${detail.hospital.lat - 0.035}%2C${detail.hospital.lng + 0.035}%2C${detail.hospital.lat + 0.035}&layer=mapnik&marker=${detail.hospital.lat}%2C${detail.hospital.lng}`} loading="lazy" referrerPolicy="no-referrer" /><p>{detail.hospital.address}</p></div><div className="privacy-note"><ShieldCheck size={16} /><span>Your password is hashed on the server. Profile actions are private to your signed-in account.</span></div></aside></div></section>}

      {page === 'profile' && <section className="content-wrap profile-page"><div className="page-title-block profile-title"><div className="eyebrow muted">YOUR MEDIROUTE SPACE</div><h1>Good to see you,<br /><span>{profile?.user?.name || user?.name || 'there'}.</span></h1><p className="lead">Your saved activity stays attached to your account. In demo mode, it resets when the server restarts.</p></div><div className="profile-summary"><div className="profile-avatar-large">{(profile?.user?.name || user?.name || 'G')[0].toUpperCase()}</div><div><small>PERSONAL ACCOUNT</small><b>{profile?.user?.name || user?.name}</b><span>{profile?.user?.identifier || ''}</span></div><button className="button button-outline profile-logout" onClick={signOut}>Sign out</button></div><div className="profile-columns"><section className="profile-section"><div className="detail-section-title"><div><div className="eyebrow muted">YOUR HISTORY</div><h2>Hospital visits</h2></div><span className="result-count">{profile?.visits?.length || 0}</span></div>{profile?.visits?.length ? <div className="profile-activity-list">{profile.visits.map((visit, index) => <button className="activity-row" key={`${visit.hospital?.id}-${index}`} onClick={() => visit.hospital && showDetail(visit.hospital)}><span className="activity-icon"><Hospital size={17} /></span><span><b>{visit.hospital?.name || 'Hospital'}</b><small>{visit.hospital?.city} · {visit.count} self-reported visit{visit.count === 1 ? '' : 's'}</small></span><ChevronRight size={16} /></button>)}</div> : <div className="profile-empty"><CalendarCheck size={23} /><b>No visits saved yet</b><p>Open a hospital profile and use “I visited here” to keep a count.</p><button onClick={() => navTo('find')}>Explore hospitals <ArrowRight size={14} /></button></div>}</section><section className="profile-section"><div className="detail-section-title"><div><div className="eyebrow muted">YOUR FEEDBACK</div><h2>Reviews you left</h2></div><span className="result-count">{profile?.reviews?.length || 0}</span></div>{profile?.reviews?.length ? <div className="profile-activity-list">{profile.reviews.map((review, index) => <button className="activity-row review-activity" key={`${review.hospital?.id}-${index}`} onClick={() => review.hospital && showDetail(review.hospital)}><span className="activity-icon amber"><Star size={16} /></span><span><b>{review.hospital?.name || 'Hospital'} · {review.stars}/5</b><small>{review.text}</small></span><ChevronRight size={16} /></button>)}</div> : <div className="profile-empty"><Star size={23} /><b>No reviews yet</b><p>Share feedback from a hospital profile. Please keep it respectful and factual.</p><button onClick={() => navTo('find')}>Browse the directory <ArrowRight size={14} /></button></div>}</section></div><div className="profile-disclaimer"><ShieldCheck size={18} /><span>All directory facts and ratings in this college project are sample values. MediRoute is not a medical provider and does not verify hospital services.</span></div></section>}

      <footer className="site-footer"><Brand /><div><span>College project demo</span><i /> <span>© 2026 MediRoute</span><i /> <button onClick={() => setToast('This project demo does not provide medical advice or emergency dispatch.')}>About this demo</button></div></footer>
    </main>

    {authOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setAuthOpen(false)}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={19} /></button><div className="auth-logo"><Brand /></div><div className="eyebrow muted">YOUR PERSONAL SPACE</div><h2 id="auth-title">{authMode === 'register' ? 'Create your account' : 'Welcome back'}</h2><p>{authMode === 'register' ? 'Save your visit counts and reviews across your sessions.' : 'Sign in to manage your MediRoute activity.'}</p><form onSubmit={submitAuth}>{authMode === 'register' && <label>Full name<input autoComplete="name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Your name" required minLength={2} maxLength={80} /></label>}<label>Mobile or email<input autoComplete="username" value={authForm.identifier} onChange={(e) => setAuthForm({ ...authForm, identifier: e.target.value })} placeholder="name@example.com or mobile" required minLength={4} /></label><label>Password<input type="password" autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="At least 8 characters" required minLength={8} /></label>{authError && <div className="auth-error">{authError}</div>}<button className="button button-primary full-width" disabled={busy}>{busy ? 'Please wait…' : authMode === 'register' ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button></form><div className="auth-switch">{authMode === 'register' ? 'Already have an account?' : 'New to MediRoute?'} <button onClick={() => { setAuthError(''); setAuthMode(authMode === 'register' ? 'login' : 'register'); }}>{authMode === 'register' ? 'Sign in' : 'Create an account'}</button></div><small className="auth-note">Demo accounts store profile actions in memory until a database is connected.</small></section></div>}
    {toast && <div className="toast-message" role="status"><Check size={16} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={15} /></button></div>}
  </div>;
}

function ArrowUpRightIcon() { return <ArrowRight size={16} className="rotate-arrow" />; }

function HospitalCard({ hospital, number, selected, onSelect, onOpen }) {
  return <article className={`hospital-card ${selected ? 'hospital-card-selected' : ''}`} onMouseEnter={onSelect}>
    <div className="hospital-card-top"><div className="hospital-identity"><span className="hospital-icon"><Hospital size={18} /></span><div><span className="hospital-type">{hospital.type} <i /> {hospital.city}</span><h3>{hospital.name}</h3></div></div><button className="card-arrow" onClick={onOpen} aria-label={`View ${hospital.name}`}><ArrowRight size={17} /></button></div>
    <div className="hospital-card-meta"><Stars value={hospital.rating} size={14} /><span className="reviews-count">{hospital.reviewCount} sample reviews</span><span className="meta-dot" /><span className="distance"><Navigation size={13} />{hospital.distanceKm?.toFixed(1) || '—'} km</span></div>
    <div className="hospital-tags">{hospital.specialties.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}{hospital.specialties.length > 3 && <span>+{hospital.specialties.length - 3}</span>}</div>
    <div className="hospital-card-bottom"><div className="hospital-facts"><span className={hospital.equipment.includes('ICU') ? 'icu-on' : ''}><BedDouble size={14} />{hospital.equipment.includes('ICU') ? `${hospital.icuBeds} sample ICU beds` : 'No ICU listed'}</span><span><span className="op-badge">OP</span>₹{hospital.opFee} sample fee</span></div><button className="view-details" onClick={onOpen}>View details <ChevronRight size={15} /></button></div>
    {number === 1 && <div className="recommended-label"><Sparkles size={12} /> CLOSEST MATCH</div>}
  </article>;
}

export default App;
