# Batch B: next 100 oldest-registered real free users not already in the campaign.
# Same exclusions as A1 (select_batch.py): test/own accounts, disposable domains, no MX, invalid,
# plus (SQL flags) already in campaign_sends (A1), admin role, non-free plan, unsubscribed, unconfirmed,
# and addresses that bounced in A1 / look like generated fake data.
import json,re,csv,sys,collections,urllib.request,urllib.parse
raw=open(sys.argv[1]).read()
m=re.search(r'(\[\{\\?"j\\?".*?\}\])\s*(\\n)?\s*</untrusted',raw,re.S); s=m.group(1)
if '\\"' in s: s=json.loads('"'+s+'"')
rows=json.loads(s)[0]['j']
disp=set(l.strip().lower() for l in open('disposable.txt') if l.strip() and not l.startswith('#'))
disp|={'tempmailmmo.co.uk','yopmail.com','mailinator.com','hacknapp.com','soppat.com','bwmyga.com','deltajohnsons.com','vnlikegiare.io.vn','4heats.com','ahm-to.my.id','heacters.com','pertok.com','teacher.semar.edu.pl','usa.priyo.edu.pl','kjkpc.net','digibeast.store'}
TEST=re.compile(r'(^|[._+-])(test|teste|testing|qa|demo|fake|fakedata|tmp|temp)([._+0-9-]|@)|fakedata|your\.email|nunomourao|nmourao|pil-investments|allforyoupt|inloco|promptforgepro', re.I)
EXTRA_DISP={'zoome.mywire.org','motlysuana.idaro.io','icetomail.com','tempmail.edu.pl','suiemail.com','daburaso.app','crackone.org','oegmail.com','skymail.ink'}  # temp-mail/typo domains reviewed manually for B
A1_IDS={r['id'] for r in csv.DictReader(open('batch_A1.csv'))}  # includes the one A1 pick swapped out for the owner seed
bounced={r['email'].lower() for r in csv.DictReader(open('A1_report.csv')) if r['last_event']=='bounced'}
mxc={}
def has_mx(d):
    if d in mxc: return mxc[d]
    try:
        q=urllib.request.Request('https://cloudflare-dns.com/dns-query?'+urllib.parse.urlencode({'name':d,'type':'MX'}),headers={'accept':'application/dns-json'})
        j=json.load(urllib.request.urlopen(q,timeout=6)); v=j.get('Status')==0 and any(a.get('type')==15 for a in j.get('Answer',[]))
    except Exception: v=False
    mxc[d]=v; return v
picked=[]; why=collections.Counter(); excluded=[]; last=None
for r in rows:
    last=r; e=r['email']; d=e.split('@')[-1]; reason=None
    if r['in_campaign']: why['already in A1']+=1; continue
    if r['id'] in A1_IDS: reason='A1 list (dropped before send)'; why[reason]+=1; excluded.append((r['rn'],d,reason)); continue
    if r['is_admin']: reason='admin'
    elif r['current_plan']!='free': reason='not free'
    elif r['unsub']: reason='unsubscribed'
    elif not r['confirmed']: reason='unconfirmed'
    elif e in bounced: reason='bounced'
    elif not re.match(r'^[^@\s]+@[a-z0-9.-]+\.[a-z]{2,}$',e): reason='invalid'
    elif TEST.search(e): reason='test/own account'
    elif d in EXTRA_DISP: reason='disposable (manual review)'
    elif d in disp or any(d.endswith('.'+x) for x in disp): reason='disposable'
    elif not has_mx(d): reason='no MX'
    if reason: why[reason]+=1; excluded.append((r['rn'],d,reason)); continue
    nm=(r['nm'] or '').strip(); tok=nm.split()[0] if nm else ''
    first=tok.title() if tok and '@' not in tok and re.match(r"^[A-Za-zÀ-ÿ'-]{2,}$", tok) else ''
    picked.append({'id':r['id'],'email':e,'first_name':first,'created_at':r['created_at'],'rn':r['rn']})
    if len(picked)==100: break
print('scanned up to rank', last['rn'], 'picked', len(picked), dict(why))
with open('batch_B.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['id','email','first_name']); [w.writerow([p['id'],p['email'],p['first_name']]) for p in picked]
with open('batch_B_excluded.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['registration_rank','domain','reason']); w.writerows(excluded)
print('with first name:', sum(1 for p in picked if p['first_name']), 'ranks', picked[0]['rn'], '->', picked[-1]['rn'], 'registered', picked[0]['created_at'][:10], '->', picked[-1]['created_at'][:10])
print(collections.Counter(p['email'].split('@')[1] for p in picked).most_common(6))
