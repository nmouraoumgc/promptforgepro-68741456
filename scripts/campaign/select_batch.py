# Picks the 100 oldest-registered real free users (confirmed email) for batch A1.
# Excludes: owner/test accounts, disposable domains, domains without MX, already-unsubscribed (in SQL).
import json,re,csv,sys,collections,urllib.request,urllib.parse
raw=open(sys.argv[1]).read()
m=re.search(r'(\[\{\\?"j\\?".*?\}\])\s*(\\n)?\s*</untrusted',raw,re.S); s=m.group(1)
if '\\"' in s: s=json.loads('"'+s+'"')
rows=json.loads(s)[0]['j']
disp=set(l.strip().lower() for l in open('disposable.txt') if l.strip() and not l.startswith('#'))
disp|={'tempmailmmo.co.uk','yopmail.com','mailinator.com','hacknapp.com','soppat.com','bwmyga.com','deltajohnsons.com','vnlikegiare.io.vn','4heats.com','ahm-to.my.id','heacters.com','pertok.com','teacher.semar.edu.pl','usa.priyo.edu.pl','kjkpc.net','digibeast.store'}  # extra temp-mail domains seen in signups
TEST=re.compile(r'(^|[._+-])(test|teste|testing|qa|demo|fake|tmp|temp)([._+0-9-]|@)|nunomourao|nmourao|pil-investments|allforyoupt|inloco|promptforgepro', re.I)
mxc={}
def has_mx(d):
    if d in mxc: return mxc[d]
    try:
        q=urllib.request.Request('https://cloudflare-dns.com/dns-query?'+urllib.parse.urlencode({'name':d,'type':'MX'}),headers={'accept':'application/dns-json'})
        j=json.load(urllib.request.urlopen(q,timeout=6)); v=j.get('Status')==0 and any(a.get('type')==15 for a in j.get('Answer',[]))
    except Exception: v=False
    mxc[d]=v; return v
picked=[]; why=collections.Counter(); excluded=[]
for r in rows:
    e=r['email']; d=e.split('@')[-1]; reason=None
    if not re.match(r'^[^@\s]+@[a-z0-9.-]+\.[a-z]{2,}$',e): reason='invalid'
    elif TEST.search(e): reason='test/own account'
    elif d in disp or any(d.endswith('.'+x) for x in disp): reason='disposable'
    elif not has_mx(d): reason='no MX'
    if reason: why[reason]+=1; excluded.append((r['rn'],d,reason)); continue
    nm=(r['nm'] or '').strip(); tok=nm.split()[0] if nm else ''
    first=tok.title() if tok and '@' not in tok and re.match(r"^[A-Za-zÀ-ÿ'-]{2,}$", tok) else ''
    picked.append({'id':r['id'],'email':e,'first_name':first,'created_at':r['created_at']})
    if len(picked)==100: break
print('scanned up to rank', r['rn'], 'picked', len(picked), dict(why))
with open('batch_A1.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['id','email','first_name']); [w.writerow([p['id'],p['email'],p['first_name']]) for p in picked]
with open('batch_A1_excluded.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['registration_rank','domain','reason']); w.writerows(excluded)
print('with first name:', sum(1 for p in picked if p['first_name']), 'registered', picked[0]['created_at'][:10], '->', picked[-1]['created_at'][:10])
print(collections.Counter(p['email'].split('@')[1] for p in picked).most_common(6))
