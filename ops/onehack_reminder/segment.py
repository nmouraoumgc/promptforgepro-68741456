# Read-only segmentation for the ONEHACK100 reminder. Input: raw_candidates.json (Supabase cwrxbxxfaemcvliasycz, 1 Nov 2026)
# + paddle_onehack100_txns.json (Paddle GET). Output: segment_onehack_reminder.csv, excluded.csv
import json,csv,re,collections,os
W='/workspace/pfp/welcome100_20261030/'; C='/workspace/pfp/campaign/'
rows=json.load(open('raw_candidates.json'))
ptx=json.load(open('paddle_onehack100_txns.json'))
paddle_done={(t.get('custom_data') or {}).get('userId') for t in ptx if t['status'] in('completed','paid')}
fake={r['user_id']:r['criteria'] for r in csv.DictReader(open(W+'fake_accounts_proposed_delete.csv'))}
disp=set(l.strip().lower() for l in open(C+'disposable.txt') if l.strip() and not l.startswith('#'))
for f in ('ext_disp1.txt','ext_disp2.txt','ext_disp3.txt'):
    for l in open(W+f):
        l=l.strip().lower()
        if l and not l.startswith('#'): disp.add(l.split()[0])
OWN=re.compile(r'nunomourao|nmourao|pil-investments|allforyoupt|inloco|promptforgepro|grokbot',re.I)
FAKE=re.compile(r'(^|[._+-])(test|teste|testing|qa|demo|fake|fakedata|tmp|temp)([._+0-9-]|@)|fakedata|your\.email',re.I)
act={r['id'] for r in csv.DictReader(open('/workspace/pfp/activation_email/segment_activation.csv'))}
FAILRS={'declined','declined_not_retryable','authentication_failed','closed_too_many_attempts','issuer_unavailable','transaction_not_permitted','too_many_attempts','invalid_payment_details'}
def canon(e):
    l,d=e.lower().split('@'); l=l.split('+')[0]
    if d in('gmail.com','googlemail.com'): l=l.replace('.','')
    return l+'@'+d
def kind(rs):
    if rs in('authentication_failed',): return '3DS'
    if rs and 'too_many' in rs: return 'too_many_attempts'
    return 'bank_declined'
seen=set(); why=collections.Counter(); seg=[]; exc=[]; st=collections.Counter()
for r in rows:
    e=(r['email'] or '').lower(); d=e.split('@')[-1]
    atts=[a for a in (r['atts'] or [])]
    oh=[a for a in atts if (a['code'] or '').upper()=='ONEHACK100']
    completed=any(a['st']=='completed' for a in oh) or r['id'] in paddle_done
    if r['src']=='backfill_discount': st['backfill_completed' if completed else 'backfill_not_completed']+=1
    reasons=[(a['rs'] or a['st']) for a in atts if a['st'] in('failed','blocked') or (a['rs'] in FAILRS)]
    reasons+=[f['err'].split(' |')[0] for f in (r['fails'] or []) if f['err']]
    failed=[x for x in reasons if x in FAILRS]
    reason=None
    if r['is_admin']: reason='admin'
    elif OWN.search(e): reason='own/QA account'
    elif completed: reason='already completed ONEHACK100'
    elif r['plan']!='free' or r['active_sub'] or r['override']: reason='already Pro'
    elif r['id'] in fake: reason='fake_accounts report 30/10'
    elif d in disp or any(d.endswith('.'+x) for x in disp) or FAKE.search(e): reason='suspect (disposable/fake-looking)'
    elif not r['confirmed']: reason='email unconfirmed'
    elif r['unsub']: reason='unsubscribed'
    elif canon(e) in seen: reason='alias duplicate'
    seen.add(canon(e))
    if reason:
        why[reason]+=1; exc.append([r['id'],e,r['src'] or '',reason]); continue
    sub='failed' if failed else 'main'
    nm=(r['nm'] or '').strip(); tok=nm.split()[0] if nm else ''
    first=tok.title() if tok and '@' not in tok and re.match(r"^[A-Za-zÀ-ÿ'-]{2,}$",tok) else ''
    seg.append(dict(id=r['id'],email=e,first_name=first,variant=sub,fail_kinds='|'.join(sorted({kind(x) for x in failed})),
        fail_reasons='|'.join(sorted(set(failed))),attempt_status='|'.join(sorted({a['st'] for a in oh})) or 'none',
        source=r['src'] or 'no_channel',created_at=r['created_at'][:10],in_activation_segment='yes' if r['id'] in act else 'no',
        prior_campaigns=r['camps'] or ''))
print('candidates',len(rows)); print('stats',dict(st)); print('excluded',dict(why.most_common()))
v=collections.Counter(s['variant'] for s in seg); print('SEGMENT',len(seg),dict(v))
print('fail kinds',collections.Counter(k for s in seg for k in s['fail_kinds'].split('|') if k))
print('by source',collections.Counter((s['variant'],s['source']) for s in seg))
print('overlap activation',sum(s['in_activation_segment']=='yes' for s in seg), collections.Counter(s['variant'] for s in seg if s['in_activation_segment']=='yes'))
print('attempt status',collections.Counter(s['attempt_status'] for s in seg))
with open('segment_onehack_reminder.csv','w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(seg[0])); w.writeheader(); w.writerows(seg)
with open('excluded.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['id','email','source','reason']); w.writerows(exc)
for p in('segment_onehack_reminder.csv','excluded.csv'): os.chmod(p,0o600)
