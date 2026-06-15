# PR4 — Admin Analytics, Interactions & User Edit Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the admin dashboard to real data: analytics charts across three pages, a gender balance status bar on the home dashboard, paginated interaction lists (likes / matches / blocks) in a new Interactions page, and a richer user-edit modal that lets admins correct gender and account tier.

**Architecture:** All new API views live in `api/admin_dashboard/views.py` and are registered in `api/admin_dashboard/urls.py`. Frontend changes touch existing admin pages (AdminDashboard, AdminAnalyticsPerformance, AdminAnalyticsRanking, AdminUsers) plus one new page (AdminInteractions). Charts use the already-installed `react-chartjs-2` + `chart.js` packages with `ChartJS.defaults` overrides to strip all blue. The new `/admin/interactions` route is registered in `frontend/src/App.jsx`.

**Tech Stack:** Django DRF APIView, `django.db.models` (TruncDate/TruncWeek/Count), React functional components, react-chartjs-2, chart.js, inline styles matching NouMatch brand tokens.

**Brand tokens (no-blue rule applies everywhere):**
- Primary `#FF2D55`, Secondary `#8B30C9`, Dark `#1A1A2E`
- Page bg `#FAF8F4`, Card bg `#FFFFFF`, Border `#E8E5DF`
- Text primary `#1A1A2E`, Text secondary `#666`
- Green (healthy) `#1E7D48`, Amber (watch) `#B8680A`, Red (critical) `#D82B2B`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `api/admin_dashboard/views.py` | Modify | Add `AdminAnalyticsView`, `AdminInteractionLikesView`, `AdminInteractionMatchesView`, `AdminInteractionBlocksView`; extend `AdminUsersManagementView.patch` |
| `api/admin_dashboard/urls.py` | Modify | Register 4 new routes |
| `frontend/src/App.jsx` | Modify | Import + register `/admin/interactions` route |
| `frontend/src/admin/components/AdminSidebar.jsx` | Modify | Add Interactions menu item |
| `frontend/src/admin/pages/AdminDashboard.jsx` | Modify | Gender balance status bar + donut chart |
| `frontend/src/admin/pages/AdminAnalyticsPerformance.jsx` | Modify | DAU line chart + Signups bar chart |
| `frontend/src/admin/pages/AdminAnalyticsRanking.jsx` | Modify | Match rate line + message conversion card + top cities bar |
| `frontend/src/admin/pages/AdminUsers.jsx` | Modify | Extend edit modal: gender, account_type, is_verified, birth_date |
| `frontend/src/admin/pages/AdminInteractions.jsx` | **Create** | Likes / Matches / Blocks tabs |

---

## Task 1: Backend — Analytics Endpoint

**Files:**
- Modify: `api/admin_dashboard/views.py` (after the last existing view class, before end of file)
- Modify: `api/admin_dashboard/urls.py`

- [ ] **Step 1: Add `AdminAnalyticsView` to views.py**

Find the end of `api/admin_dashboard/views.py` and append this class (before the final blank lines):

```python
class AdminAnalyticsView(APIView):
    """
    GET /api/noumatch-admin/analytics/
    Returns aggregated analytics: DAU, signups, gender ratio,
    match rate, message conversion, top cities.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Count, Q
        from django.db.models.functions import TruncDate, TruncWeek
        from django.utils import timezone
        from datetime import timedelta
        from interactions.models import Like
        from matches.models import Match
        from chat.models import Conversation

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        eight_weeks_ago = now - timedelta(weeks=8)

        # DAU — distinct users active per day (last 30 days)
        dau_qs = (
            User.objects
            .filter(last_activity__gte=thirty_days_ago, is_staff=False)
            .annotate(date=TruncDate('last_activity'))
            .values('date')
            .annotate(count=Count('id', distinct=True))
            .order_by('date')
        )
        dau = [{'date': str(r['date']), 'count': r['count']} for r in dau_qs]

        # Signups — new users per day (last 30 days)
        signups_qs = (
            User.objects
            .filter(date_joined__gte=thirty_days_ago, is_staff=False)
            .annotate(date=TruncDate('date_joined'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        signups = [{'date': str(r['date']), 'count': r['count']} for r in signups_qs]

        # Gender ratio — % split across all non-staff users
        gender_qs = (
            User.objects
            .filter(is_active=True, is_staff=False)
            .values('gender')
            .annotate(count=Count('id'))
        )
        total_gendered = sum(r['count'] for r in gender_qs) or 1
        gender_map = {(r['gender'] or 'other'): r['count'] for r in gender_qs}
        gender_ratio = {
            'male': round(gender_map.get('male', 0) / total_gendered * 100),
            'female': round(gender_map.get('female', 0) / total_gendered * 100),
        }

        # Match rate per week — matches / (likes * 0.5), last 8 weeks
        matches_by_week = (
            Match.objects
            .filter(created_at__gte=eight_weeks_ago)
            .annotate(week=TruncWeek('created_at'))
            .values('week')
            .annotate(count=Count('id'))
            .order_by('week')
        )
        likes_by_week = (
            Like.objects
            .filter(created_at__gte=eight_weeks_ago)
            .annotate(week=TruncWeek('created_at'))
            .values('week')
            .annotate(count=Count('id'))
            .order_by('week')
        )
        likes_map = {r['week']: r['count'] for r in likes_by_week}
        match_rate = []
        for r in matches_by_week:
            week_label = r['week'].strftime('%G-W%V')
            swipes = likes_map.get(r['week'], 0)
            rate = round(r['count'] / (swipes * 0.5), 2) if swipes else 0.0
            match_rate.append({'week': week_label, 'rate': rate})

        # Message conversion — % of matches with at least one message
        total_matches = Match.objects.count()
        matches_with_msgs = (
            Conversation.objects
            .filter(messages__isnull=False)
            .distinct()
            .count()
        )
        message_conversion = round(matches_with_msgs / total_matches, 2) if total_matches else 0.0

        # Top 8 cities
        top_cities_qs = (
            User.objects
            .filter(is_active=True, is_staff=False)
            .exclude(city='')
            .values('city')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )
        top_cities = [{'city': r['city'], 'count': r['count']} for r in top_cities_qs]

        return Response({
            'dau': dau,
            'signups': signups,
            'gender_ratio': gender_ratio,
            'match_rate': match_rate,
            'message_conversion': message_conversion,
            'top_cities': top_cities,
        })
```

- [ ] **Step 2: Register the route in urls.py**

In `api/admin_dashboard/urls.py`, add `AdminAnalyticsView` to the imports at the top:

```python
from .views import (
    # ... existing imports ...
    AdminAnalyticsView,
    AdminInteractionLikesView,
    AdminInteractionMatchesView,
    AdminInteractionBlocksView,
)
```

Then add these lines to `urlpatterns` (after the existing `analytics/ranking/` line):

```python
path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
path('interactions/likes/', AdminInteractionLikesView.as_view(), name='admin-interactions-likes'),
path('interactions/matches/', AdminInteractionMatchesView.as_view(), name='admin-interactions-matches'),
path('interactions/blocks/', AdminInteractionBlocksView.as_view(), name='admin-interactions-blocks'),
```

- [ ] **Step 3: Commit**

```bash
git add api/admin_dashboard/views.py api/admin_dashboard/urls.py
git commit -m "feat: add AdminAnalyticsView endpoint for PR4 charts"
```

---

## Task 2: Backend — Interaction List Endpoints

**Files:**
- Modify: `api/admin_dashboard/views.py` (append after AdminAnalyticsView)

- [ ] **Step 1: Add the three interaction list views to views.py**

Append immediately after `AdminAnalyticsView`:

```python
class AdminInteractionLikesView(APIView):
    """GET /api/noumatch-admin/interactions/likes/ — paginated like events."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Q
        from interactions.models import Like

        page = max(1, int(request.query_params.get('page', 1)))
        limit = min(50, max(1, int(request.query_params.get('limit', 20))))
        search = request.query_params.get('search', '').strip()

        qs = Like.objects.select_related('from_user', 'to_user').order_by('-created_at')
        if search:
            qs = qs.filter(
                Q(from_user__email__icontains=search)
                | Q(from_user__first_name__icontains=search)
                | Q(from_user__last_name__icontains=search)
                | Q(to_user__email__icontains=search)
                | Q(to_user__first_name__icontains=search)
                | Q(to_user__last_name__icontains=search)
            )

        total = qs.count()
        offset = (page - 1) * limit
        items = list(qs[offset: offset + limit])

        def _user_mini(u):
            return {
                'id': u.id,
                'name': f"{u.first_name} {u.last_name}".strip() or u.email,
                'email': u.email,
            }

        return Response({
            'count': total,
            'page': page,
            'pages': max(1, (total + limit - 1) // limit),
            'results': [
                {
                    'id': like.id,
                    'from_user': _user_mini(like.from_user),
                    'to_user': _user_mini(like.to_user),
                    'type': like.type,
                    'created_at': like.created_at.isoformat(),
                }
                for like in items
            ],
        })


class AdminInteractionMatchesView(APIView):
    """GET /api/noumatch-admin/interactions/matches/ — paginated match events."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Q
        from matches.models import Match

        page = max(1, int(request.query_params.get('page', 1)))
        limit = min(50, max(1, int(request.query_params.get('limit', 20))))
        search = request.query_params.get('search', '').strip()

        qs = Match.objects.select_related('user1', 'user2').prefetch_related('conversation').order_by('-created_at')
        if search:
            qs = qs.filter(
                Q(user1__email__icontains=search)
                | Q(user1__first_name__icontains=search)
                | Q(user1__last_name__icontains=search)
                | Q(user2__email__icontains=search)
                | Q(user2__first_name__icontains=search)
                | Q(user2__last_name__icontains=search)
            )

        total = qs.count()
        offset = (page - 1) * limit
        items = list(qs[offset: offset + limit])

        def _user_mini(u):
            return {
                'id': u.id,
                'name': f"{u.first_name} {u.last_name}".strip() or u.email,
                'email': u.email,
            }

        def _has_messages(match):
            try:
                return match.conversation.messages.exists()
            except Exception:
                return False

        return Response({
            'count': total,
            'page': page,
            'pages': max(1, (total + limit - 1) // limit),
            'results': [
                {
                    'id': m.id,
                    'user1': _user_mini(m.user1),
                    'user2': _user_mini(m.user2),
                    'has_messages': _has_messages(m),
                    'created_at': m.created_at.isoformat(),
                }
                for m in items
            ],
        })


class AdminInteractionBlocksView(APIView):
    """GET /api/noumatch-admin/interactions/blocks/ — paginated block events."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Q
        from block.models import Block

        page = max(1, int(request.query_params.get('page', 1)))
        limit = min(50, max(1, int(request.query_params.get('limit', 20))))
        search = request.query_params.get('search', '').strip()

        qs = Block.objects.select_related('blocker', 'blocked').order_by('-created_at')
        if search:
            qs = qs.filter(
                Q(blocker__email__icontains=search)
                | Q(blocker__first_name__icontains=search)
                | Q(blocker__last_name__icontains=search)
                | Q(blocked__email__icontains=search)
                | Q(blocked__first_name__icontains=search)
                | Q(blocked__last_name__icontains=search)
            )

        total = qs.count()
        offset = (page - 1) * limit
        items = list(qs[offset: offset + limit])

        def _user_mini(u):
            return {
                'id': u.id,
                'name': f"{u.first_name} {u.last_name}".strip() or u.email,
                'email': u.email,
            }

        return Response({
            'count': total,
            'page': page,
            'pages': max(1, (total + limit - 1) // limit),
            'results': [
                {
                    'id': b.id,
                    'blocker': _user_mini(b.blocker),
                    'blocked': _user_mini(b.blocked),
                    'created_at': b.created_at.isoformat(),
                }
                for b in items
            ],
        })
```

- [ ] **Step 2: Commit**

```bash
git add api/admin_dashboard/views.py
git commit -m "feat: add interaction list endpoints (likes, matches, blocks)"
```

---

## Task 3: Backend — Extend User PATCH

**Files:**
- Modify: `api/admin_dashboard/views.py` — `AdminUsersManagementView.patch` (currently lines ~1006–1036)

- [ ] **Step 1: Replace the patch method body**

Find the `patch` method of `AdminUsersManagementView` (currently ends at `user.save()` / `return Response({'success': True})`). Replace the entire method with:

```python
def patch(self, request, user_id):
    user = get_object_or_404(User, id=user_id)
    payload = request.data

    role = payload.get('role')
    is_active = payload.get('is_active')
    first_name = payload.get('first_name')
    last_name = payload.get('last_name')
    username = payload.get('username')
    gender = payload.get('gender')
    account_type = payload.get('account_type')
    is_verified = payload.get('is_verified')
    birth_date = payload.get('birth_date')

    if role is not None:
        role = str(role).strip().lower()
        if role == 'superadmin':
            user.is_staff = True
            user.is_superuser = True
        elif role == 'staff':
            user.is_staff = True
            user.is_superuser = False
        else:
            user.is_staff = False
            user.is_superuser = False
    if is_active is not None:
        user.is_active = bool(is_active)
    if first_name is not None:
        user.first_name = str(first_name).strip()
    if last_name is not None:
        user.last_name = str(last_name).strip()
    if username is not None and str(username).strip():
        user.username = str(username).strip()
    if gender is not None:
        if gender in ('male', 'female', 'other', ''):
            user.gender = gender
    if account_type is not None:
        if account_type in ('free', 'premium', 'god_mode'):
            user.account_type = account_type
    if is_verified is not None:
        user.is_verified = bool(is_verified)
    if birth_date is not None:
        from datetime import date as _date
        try:
            user.birth_date = _date.fromisoformat(birth_date) if birth_date else None
        except (ValueError, TypeError):
            pass

    user.save()
    return Response({'success': True})
```

- [ ] **Step 2: Commit**

```bash
git add api/admin_dashboard/views.py
git commit -m "feat: extend admin user PATCH to accept gender, account_type, is_verified, birth_date"
```

---

## Task 4: Frontend — Extend AdminUsers Edit Modal

**Files:**
- Modify: `frontend/src/admin/pages/AdminUsers.jsx`

- [ ] **Step 1: Add new fields to `openEditModal`**

Find `openEditModal` (~line 202) and replace it:

```javascript
const openEditModal = (user) => {
  setEditingUser(user);
  setUserForm({
    first_name: user.full_name?.split(' ')[0] || '',
    last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
    username: user.username || '',
    email: user.email || '',
    password: '',
    role: user.role || 'app_user',
    is_active: user.is_active,
    gender: user.gender || '',
    account_type: user.account_type || 'free',
    is_verified: user.is_verified || false,
    birth_date: user.birth_date || '',
  });
  setShowUserModal(true);
};
```

- [ ] **Step 2: Add new fields to `saveUser` PATCH call**

Find the `saveUser` function's PATCH data block (~line 222) and replace the `data:` object:

```javascript
data: {
  first_name: userForm.first_name,
  last_name: userForm.last_name,
  username: userForm.username,
  role: userForm.role,
  is_active: userForm.is_active,
  gender: userForm.gender,
  account_type: userForm.account_type,
  is_verified: userForm.is_verified,
  birth_date: userForm.birth_date || null,
},
```

- [ ] **Step 3: Add new fields to the modal body**

Find the modal body `<div className="modal-body d-flex flex-column gap-2">` (~line 704). After the existing `is_active` checkbox `<label>` and before the closing `</div>`, insert — but first, also add a visual divider. Replace the entire modal-body section:

```jsx
<div className="modal-body d-flex flex-column gap-2">
  <input className="form-control" placeholder="First name" value={userForm.first_name} onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })} />
  <input className="form-control" placeholder="Last name" value={userForm.last_name} onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })} />
  <input className="form-control" placeholder="Username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
  <input className="form-control" placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} disabled={Boolean(editingUser)} />
  {!editingUser && <input className="form-control" placeholder="Password" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />}
  <select className="form-select" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
    <option value="app_user">App User</option>
    <option value="staff">Staff</option>
    <option value="superadmin">Super Admin</option>
  </select>
  <label className="d-flex align-items-center gap-2">
    <input type="checkbox" checked={userForm.is_active} onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })} />
    Active
  </label>

  {editingUser && (
    <>
      <hr style={{ margin: '4px 0', borderColor: '#E8E5DF' }} />
      <small style={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', fontSize: '10px' }}>Profil</small>

      <select className="form-select" value={userForm.gender} onChange={(e) => setUserForm({ ...userForm, gender: e.target.value })}>
        <option value="">Genre — non spécifié</option>
        <option value="female">Femme</option>
        <option value="male">Homme</option>
        <option value="other">Autre</option>
      </select>

      <select className="form-select" value={userForm.account_type} onChange={(e) => setUserForm({ ...userForm, account_type: e.target.value })}>
        <option value="free">Free</option>
        <option value="premium">Premium</option>
        <option value="god_mode">God Mode</option>
      </select>

      <label className="d-flex align-items-center gap-2">
        <input type="checkbox" checked={userForm.is_verified} onChange={(e) => setUserForm({ ...userForm, is_verified: e.target.checked })} />
        Profil vérifié
      </label>

      <div>
        <label className="form-label small mb-1" style={{ color: '#666' }}>Date de naissance</label>
        <input className="form-control" type="date" value={userForm.birth_date} onChange={(e) => setUserForm({ ...userForm, birth_date: e.target.value })} />
      </div>
    </>
  )}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/admin/pages/AdminUsers.jsx
git commit -m "feat: extend admin user edit modal with gender, account_type, is_verified, birth_date"
```

---

## Task 5: Frontend — Gender Balance Bar on AdminDashboard

**Files:**
- Modify: `frontend/src/admin/pages/AdminDashboard.jsx`

- [ ] **Step 1: Add analytics state + fetch**

After the existing `activeUsersError` state declaration (~line 70), add:

```javascript
const [analytics, setAnalytics] = useState(null);
```

In the first `useEffect` that calls `fetchDashboard`, after `setMetrics(res.data)` add a parallel analytics fetch. Find the `fetchDashboard` async function and add the analytics call inside it, right after the dashboard call succeeds:

```javascript
// After setMetrics(res.data) and setError(''):
try {
  const analyticsRes = await adminRequest({ method: 'get', url: `${API_BASE}/analytics/` });
  setAnalytics(analyticsRes.data);
} catch (_e) {
  // analytics failure doesn't break the dashboard
}
```

- [ ] **Step 2: Add gender balance bar JSX**

Find the `return (` of `AdminDashboard` and locate `<div className="admin-page-shell dashboard-premium-shell">`. Insert the gender bar as the **first child** of that div, before `<section className="dashboard-spotlight-grid">`:

```jsx
{analytics && (() => {
  const female = analytics.gender_ratio?.female ?? 0;
  const male = analytics.gender_ratio?.male ?? 0;
  const minority = Math.min(female, male);
  const isHealthy = minority >= 40;
  const isWatch = minority >= 30 && minority < 40;
  const color = isHealthy ? '#1E7D48' : isWatch ? '#B8680A' : '#D82B2B';
  const bg = isHealthy ? '#F0FBF4' : isWatch ? '#FEF9ED' : '#FEF0EF';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: bg, border: `1px solid ${color}22`,
      borderRadius: 10, padding: '10px 16px', marginBottom: 20,
    }}>
      {!isHealthy && <i className="fas fa-triangle-exclamation" style={{ color, fontSize: 14, flexShrink: 0 }} />}
      <span style={{ fontWeight: 600, fontSize: '0.82rem', color, flexShrink: 0 }}>Équilibre H/F</span>
      <span style={{ fontSize: '0.82rem', color, fontWeight: 500 }}>
        {female}% Femme · {male}% Homme
      </span>
      <div style={{ flex: 1, height: 6, background: '#E8E5DF', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${female}%`, height: '100%', background: '#FF2D55', borderRadius: 3 }} />
      </div>
    </div>
  );
})()}
```

- [ ] **Step 3: Add gender donut chart below spotlight cards**

The dashboard already imports `Doughnut` from react-chartjs-2. After the `<section className="dashboard-spotlight-grid">` block (the spotlight cards section), add:

```jsx
{analytics?.gender_ratio && (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E5DF', padding: '20px 20px 12px' }}>
      <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '0.82rem', color: '#1A1A2E', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Répartition par genre
      </p>
      {/* Custom legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        {[
          { label: `Femme ${analytics.gender_ratio.female}%`, color: '#FF2D55' },
          { label: `Homme ${analytics.gender_ratio.male}%`, color: '#8B30C9' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#666' }}>
            <span style={{ width: 10, height: 10, background: color, display: 'inline-block', borderRadius: 2, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>
      <div style={{ height: 160 }}>
        <Doughnut
          data={{
            labels: ['Femme', 'Homme'],
            datasets: [{
              data: [analytics.gender_ratio.female, analytics.gender_ratio.male],
              backgroundColor: ['#FF2D55', '#8B30C9'],
              borderColor: ['#FF2D55', '#8B30C9'],
              borderWidth: 0,
              hoverOffset: 4,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%` } } },
            cutout: '65%',
          }}
        />
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/admin/pages/AdminDashboard.jsx
git commit -m "feat: add gender balance bar and donut chart to admin dashboard home"
```

---

## Task 6: Frontend — AdminAnalyticsPerformance: DAU + Signups Charts

**Files:**
- Modify: `frontend/src/admin/pages/AdminAnalyticsPerformance.jsx`

- [ ] **Step 1: Add analytics state + fetch**

At the top of the existing `AdminAnalyticsPerformance` component, add state and a fetch. Find where existing state is declared (after the `useState` hooks) and add:

```javascript
const [analytics, setAnalytics] = useState(null);
const [analyticsLoading, setAnalyticsLoading] = useState(true);
const [analyticsError, setAnalyticsError] = useState('');
```

Add this `useEffect` alongside the existing ones (not replacing them):

```javascript
useEffect(() => {
  const token = getAdminAuthToken();
  if (!token) return;
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await adminRequest({ method: 'get', url: `${API_BASE}/analytics/` });
      setAnalytics(res.data);
    } catch (err) {
      setAnalyticsError('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };
  fetchAnalytics();
}, []);
```

- [ ] **Step 2: Add Chart.js imports**

At the top of the file, add these imports after the existing imports:

```javascript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);
ChartJS.defaults.color = '#666';
ChartJS.defaults.borderColor = '#E8E5DF';
```

- [ ] **Step 3: Add charts to the JSX**

In the return JSX, find `<div className="admin-page-shell">` and inside `<div className="admin-page-shell">`, add an analytics section **before** the existing content (or at the top of the page body, right after the page header):

```jsx
{/* ── Analytics Charts ── */}
{analyticsLoading && <AdminPageSpinner label="Chargement des métriques..." />}
{analyticsError && <div className="alert alert-danger">{analyticsError}</div>}
{analytics && (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
    {/* DAU line chart */}
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E5DF', padding: '20px 20px 12px' }}>
      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.82rem', color: '#1A1A2E', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Utilisateurs actifs / jour (30j)
      </p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#666' }}>
          <span style={{ width: 10, height: 10, background: '#FF2D55', display: 'inline-block', borderRadius: 2 }} />
          DAU
        </div>
      </div>
      <div style={{ height: 200 }}>
        <Line
          data={{
            labels: analytics.dau.map((d) => d.date.slice(5)),
            datasets: [{
              label: 'DAU',
              data: analytics.dau.map((d) => d.count),
              borderColor: '#FF2D55',
              backgroundColor: 'rgba(255,45,85,0.10)',
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointBackgroundColor: '#FF2D55',
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} utilisateurs` } } },
            scales: {
              x: { grid: { color: '#E8E5DF' }, ticks: { color: '#666', maxTicksLimit: 8 } },
              y: { grid: { color: '#E8E5DF' }, ticks: { color: '#666' }, beginAtZero: true },
            },
          }}
        />
      </div>
    </div>

    {/* Signups bar chart */}
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E5DF', padding: '20px 20px 12px' }}>
      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.82rem', color: '#1A1A2E', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Nouvelles inscriptions / jour (30j)
      </p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#666' }}>
          <span style={{ width: 10, height: 10, background: '#FF2D55', display: 'inline-block', borderRadius: 2 }} />
          Inscriptions
        </div>
      </div>
      <div style={{ height: 200 }}>
        <Bar
          data={{
            labels: analytics.signups.map((d) => d.date.slice(5)),
            datasets: [{
              label: 'Inscriptions',
              data: analytics.signups.map((d) => d.count),
              backgroundColor: '#FF2D55',
              borderColor: '#FF2D55',
              borderRadius: 4,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} inscriptions` } } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#666', maxTicksLimit: 8 } },
              y: { grid: { color: '#E8E5DF' }, ticks: { color: '#666' }, beginAtZero: true },
            },
          }}
        />
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/admin/pages/AdminAnalyticsPerformance.jsx
git commit -m "feat: add DAU and signups charts to AdminAnalyticsPerformance"
```

---

## Task 7: Frontend — AdminAnalyticsRanking: Match Rate + Conversion + Top Cities

**Files:**
- Modify: `frontend/src/admin/pages/AdminAnalyticsRanking.jsx`

- [ ] **Step 1: Add analytics state + fetch**

After existing state declarations in `AdminAnalyticsRanking`, add:

```javascript
const [analytics, setAnalytics] = useState(null);
const [analyticsLoading, setAnalyticsLoading] = useState(true);
const [analyticsError, setAnalyticsError] = useState('');
```

Add this `useEffect`:

```javascript
useEffect(() => {
  const token = getAdminAuthToken();
  if (!token) return;
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await adminRequest({ method: 'get', url: `${API_BASE}/analytics/` });
      setAnalytics(res.data);
    } catch (err) {
      setAnalyticsError('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };
  fetchAnalytics();
}, []);
```

- [ ] **Step 2: Add Chart.js imports**

```javascript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);
ChartJS.defaults.color = '#666';
ChartJS.defaults.borderColor = '#E8E5DF';
```

- [ ] **Step 3: Add charts to the JSX**

In the return, right after the page header `<div className="admin-page-header">...</div>`, insert:

```jsx
{analyticsLoading && <AdminPageSpinner label="Chargement des métriques..." />}
{analyticsError && <div className="alert alert-danger">{analyticsError}</div>}
{analytics && (
  <>
    {/* Top row: Match rate + Message conversion */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
      {/* Match rate line chart */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E5DF', padding: '20px 20px 12px' }}>
        <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.82rem', color: '#1A1A2E', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Taux de match par semaine (8 sem.)
        </p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#666' }}>
            <span style={{ width: 10, height: 10, background: '#8B30C9', display: 'inline-block', borderRadius: 2 }} />
            Taux de match
          </div>
        </div>
        <div style={{ height: 200 }}>
          <Line
            data={{
              labels: analytics.match_rate.map((d) => d.week),
              datasets: [{
                label: 'Taux de match',
                data: analytics.match_rate.map((d) => d.rate),
                borderColor: '#8B30C9',
                backgroundColor: 'rgba(139,48,201,0.10)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#8B30C9',
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y}` } } },
              scales: {
                x: { grid: { color: '#E8E5DF' }, ticks: { color: '#666' } },
                y: { grid: { color: '#E8E5DF' }, ticks: { color: '#666' }, beginAtZero: true, max: 1 },
              },
            }}
          />
        </div>
      </div>

      {/* Message conversion metric card */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E5DF', padding: '24px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.82rem', color: '#1A1A2E', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Conversion vers messages
        </p>
        <p style={{ margin: 0, fontSize: '3rem', fontWeight: 800, color: '#FF2D55', lineHeight: 1 }}>
          {Math.round((analytics.message_conversion || 0) * 100)}%
        </p>
        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#666' }}>
          des matchs ont eu au moins un message
        </p>
      </div>
    </div>

    {/* Top cities horizontal bar */}
    {analytics.top_cities.length > 0 && (
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E5DF', padding: '20px 20px 12px', marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.82rem', color: '#1A1A2E', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Top villes
        </p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#666' }}>
            <span style={{ width: 10, height: 10, background: '#FF2D55', display: 'inline-block', borderRadius: 2 }} />
            Utilisateurs
          </div>
        </div>
        <div style={{ height: Math.max(analytics.top_cities.length * 48, 200) }}>
          <Bar
            data={{
              labels: analytics.top_cities.map((c) => c.city),
              datasets: [{
                label: 'Utilisateurs',
                data: analytics.top_cities.map((c) => c.count),
                backgroundColor: '#FF2D55',
                borderColor: '#FF2D55',
                borderRadius: 4,
              }],
            }}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.x} utilisateurs` } } },
              scales: {
                x: { grid: { color: '#E8E5DF' }, ticks: { color: '#666' }, beginAtZero: true },
                y: { grid: { display: false }, ticks: { color: '#666' } },
              },
            }}
          />
        </div>
      </div>
    )}
  </>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/admin/pages/AdminAnalyticsRanking.jsx
git commit -m "feat: add match rate, message conversion, and top cities charts to AdminAnalyticsRanking"
```

---

## Task 8: Frontend — New AdminInteractions Page

**Files:**
- Create: `frontend/src/admin/pages/AdminInteractions.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import AdminPageSpinner from '../components/AdminPageSpinner';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';

const API_BASE = getAdminApiBase();

const TABS = [
  { key: 'likes', label: 'Likes', icon: 'fas fa-heart' },
  { key: 'matches', label: 'Matchs', icon: 'fas fa-handshake' },
  { key: 'blocks', label: 'Blocages', icon: 'fas fa-ban' },
];

const PILL = {
  display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
  borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
};

function UserCell({ user }) {
  return (
    <div>
      <div style={{ fontWeight: 600, color: '#1A1A2E', fontSize: '0.85rem' }}>{user.name}</div>
      <div style={{ color: '#999', fontSize: '0.75rem' }}>{user.email}</div>
    </div>
  );
}

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, padding: '12px 0 0' }}>
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid #E8E5DF', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', color: '#666' }}
      >
        <i className="fas fa-chevron-left" />
      </button>
      <span style={{ fontSize: '0.82rem', color: '#666' }}>
        {page} / {pages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid #E8E5DF', background: '#fff', cursor: page >= pages ? 'not-allowed' : 'pointer', color: '#666' }}
      >
        <i className="fas fa-chevron-right" />
      </button>
    </div>
  );
}

export default function AdminInteractions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('likes');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ count: 0, pages: 1, results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [darkMode]);

  const fetchData = useCallback(async (tab, pg, q) => {
    const token = getAdminAuthToken();
    if (!token) { navigate('/admin/login'); return; }
    try {
      setLoading(true);
      setError('');
      const res = await adminRequest({
        method: 'get',
        url: `${API_BASE}/interactions/${tab}/`,
        params: { page: pg, limit: 20, search: q },
      });
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/admin/login');
      } else {
        setError('Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData(activeTab, page, search);
  }, [activeTab, page, fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData(activeTab, 1, search);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
    setData({ count: 0, pages: 1, results: [] });
  };

  const handleMenuClick = (menu, path) => navigate(path);

  const formatDate = (iso) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu="interactions" onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="admin-page-shell">
          <div className="admin-page-header">
            <div className="admin-page-header-copy">
              <h2 className="admin-page-title">
                <i className="fas fa-network-wired me-2 text-danger" />
                Interactions utilisateurs
              </h2>
              <p className="admin-page-subtitle">Qui a aimé, matché ou bloqué qui.</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                style={{
                  padding: '8px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  background: activeTab === t.key ? '#FF2D55' : '#fff',
                  color: activeTab === t.key ? '#fff' : '#666',
                  boxShadow: activeTab === t.key ? '0 2px 8px rgba(255,45,85,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <i className={`${t.icon} me-2`} />{t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              className="form-control"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: '#FF2D55', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fas fa-search me-1" /> Chercher
            </button>
          </form>

          {/* Table */}
          <div className="recent-blocks-card admin-section" style={{ margin: 0 }}>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              {loading
                ? <AdminPageSpinner label="Chargement..." />
                : (
                  <div className="table-responsive">
                    <table className="table admin-table">
                      <thead>
                        {activeTab === 'likes' && (
                          <tr>
                            <th>De</th><th>À</th><th>Type</th><th>Date</th>
                          </tr>
                        )}
                        {activeTab === 'matches' && (
                          <tr>
                            <th>Utilisateur 1</th><th>Utilisateur 2</th><th>Conversation</th><th>Date</th>
                          </tr>
                        )}
                        {activeTab === 'blocks' && (
                          <tr>
                            <th>Bloqueur</th><th>Bloqué</th><th>Date</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {data.results.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center py-5">
                              <div className="admin-empty-state"><i className="fas fa-inbox" /><span>Aucun résultat.</span></div>
                            </td>
                          </tr>
                        ) : data.results.map((row) => (
                          <tr key={row.id}>
                            {activeTab === 'likes' && (
                              <>
                                <td><UserCell user={row.from_user} /></td>
                                <td><UserCell user={row.to_user} /></td>
                                <td>
                                  <span style={{ ...PILL, background: row.type === 'coup_de_coeur' ? 'rgba(139,48,201,0.1)' : 'rgba(255,45,85,0.1)', color: row.type === 'coup_de_coeur' ? '#8B30C9' : '#FF2D55' }}>
                                    {row.type === 'coup_de_coeur' ? '💜 Coup de Coeur' : '❤️ Like'}
                                  </span>
                                </td>
                                <td style={{ color: '#666', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                              </>
                            )}
                            {activeTab === 'matches' && (
                              <>
                                <td><UserCell user={row.user1} /></td>
                                <td><UserCell user={row.user2} /></td>
                                <td>
                                  <span style={{ ...PILL, background: row.has_messages ? 'rgba(30,125,72,0.1)' : 'rgba(200,200,200,0.2)', color: row.has_messages ? '#1E7D48' : '#888' }}>
                                    {row.has_messages ? '✓ Messagé' : 'Pas encore'}
                                  </span>
                                </td>
                                <td style={{ color: '#666', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                              </>
                            )}
                            {activeTab === 'blocks' && (
                              <>
                                <td><UserCell user={row.blocker} /></td>
                                <td><UserCell user={row.blocked} /></td>
                                <td style={{ color: '#666', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
              <Pagination page={page} pages={data.pages} onPage={setPage} />
              {!loading && data.count > 0 && (
                <div style={{ color: '#999', fontSize: '0.78rem', marginTop: 8 }}>
                  {data.count} résultat{data.count !== 1 ? 's' : ''} au total
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/admin/pages/AdminInteractions.jsx
git commit -m "feat: create AdminInteractions page with likes/matches/blocks tabs"
```

---

## Task 9: Wire the Route + Sidebar

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/admin/components/AdminSidebar.jsx`

- [ ] **Step 1: Add route to App.jsx**

In `frontend/src/App.jsx`, find the block:
```javascript
import AdminSwipeStats from "./admin/pages/AdminSwipeStats.jsx";
```
Add after it:
```javascript
import AdminInteractions from "./admin/pages/AdminInteractions.jsx";
```

In the `noLayoutRoutes` array, add `"/admin/interactions"` alongside the other admin routes.

In the `<Routes>` block, find:
```jsx
<Route path="/admin/swipe-stats" element={<AdminSwipeStats />} />
```
Add after it:
```jsx
<Route path="/admin/interactions" element={<AdminInteractions />} />
```

- [ ] **Step 2: Add sidebar menu item**

In `frontend/src/admin/components/AdminSidebar.jsx`, find `getMenuFromPath` and add:
```javascript
if (path.includes('/admin/interactions')) return 'interactions';
```

In the `menuItems` array, add after the `swipe-stats` entry:
```javascript
{ key: 'interactions', label: 'Interactions', icon: 'fas fa-network-wired', path: '/admin/interactions' },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx frontend/src/admin/components/AdminSidebar.jsx
git commit -m "feat: register /admin/interactions route and sidebar entry"
```

---

## Task 10: Push to Staging + Main

- [ ] **Step 1: Verify staging branch**

```bash
git checkout staging
git merge main  # pull in any recent main changes
```

- [ ] **Step 2: Push staging**

```bash
git push origin staging
```

- [ ] **Step 3: Merge to main and push**

```bash
git checkout main
git merge staging --no-edit
git push origin main
```

Railway will auto-deploy; no migration needed (no new DB models).

---

## Self-Review

**Spec coverage check:**
- ✅ `GET /api/noumatch-admin/analytics/` — Task 1
- ✅ DAU, signups, gender_ratio, match_rate, message_conversion, top_cities — Task 1
- ✅ DAU line + signups bar on Performance page — Task 6
- ✅ Gender donut on Dashboard home — Task 5
- ✅ Gender balance status bar (green/amber/red) — Task 5
- ✅ Match rate line + conversion card + top cities bar on Ranking page — Task 7
- ✅ `responsive: true, maintainAspectRatio: false` on every chart — Tasks 6, 7
- ✅ Custom HTML legends (10×10px squares) — Tasks 5, 6, 7
- ✅ No blue anywhere — all charts use `#FF2D55` or `#8B30C9` only
- ✅ `ChartJS.defaults.color = '#666'; ChartJS.defaults.borderColor = '#E8E5DF'` — Tasks 6, 7
- ✅ Extend PATCH: gender, account_type, is_verified, birth_date — Task 3
- ✅ Edit modal new fields (edit-only, behind `{editingUser &&}`) — Task 4
- ✅ Interaction list endpoints (likes/matches/blocks) — Task 2
- ✅ AdminInteractions.jsx with 3 tabs — Task 8
- ✅ Sidebar + route wiring — Task 9

**No-blue audit:** All `backgroundColor`, `borderColor`, badge colors, tooltip overrides in Tasks 5–8 use only `#FF2D55`, `#8B30C9`, `#1E7D48`, `#B8680A`, `#D82B2B`, `#E8E5DF`, or neutral greys.
