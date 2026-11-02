import json,re,csv,collections,urllib.request,urllib.parse,sys
W='/workspace/pfp/welcome100_20261030/'; C='/workspace/pfp/campaign/'
raw=open(sys.argv[1]).read()
m=re.search(r'(\[\{\\?"j\\?".*?\}\])\s*(\\n)?\s*</untrusted',raw,re.S); s=m.group(1)
if '\\"' in s: s=json.loads('"'+s+'"')
rows=json.loads(s)[0]['j']
print('users',len(rows))
fake={r['user_id']:r['criteria'] for r in csv.DictReader(open(W+'fake_accounts_proposed_delete.csv'))}
disp=set(l.strip().lower() for l in open(C+'disposable.txt') if l.strip() and not l.startswith('#'))
disp|={'tempmailmmo.co.uk','yopmail.com','mailinator.com','hacknapp.com','soppat.com','bwmyga.com','deltajohnsons.com','vnlikegiare.io.vn','4heats.com','ahm-to.my.id','heacters.com','pertok.com','teacher.semar.edu.pl','usa.priyo.edu.pl','kjkpc.net','digibeast.store','zoome.mywire.org','motlysuana.idaro.io','icetomail.com','tempmail.edu.pl','suiemail.com','daburaso.app','oegmail.com','skymail.ink','crackone.org','wibucrypto.pro','rommiui.com','tmpwebmail.com','tempmailt.com','temail.ooguy.com','cskgmail.com'}
for f in ('ext_disp1.txt','ext_disp2.txt','ext_disp3.txt'):
    for l in open(W+f):
        l=l.strip().lower()
        if l and not l.startswith('#'): disp.add(l.split()[0])
OWN=re.compile(r'nunomourao|nmourao|pil-investments|allforyoupt|inloco|promptforgepro|grokbot',re.I)
FAKE=re.compile(r'(^|[._+-])(test|teste|testing|qa|demo|fake|fakedata|tmp|temp)([._+0-9-]|@)|fakedata|your\.email',re.I)
bounced={r['email'].lower() for r in csv.DictReader(open(C+'A1_report.csv')) if r['last_event']=='bounced'}
bounced|={'shekoshadow3@gmail.com','ha.rbi.nbou.c.he.r6.9@gmail.com','ollaman645@gmail.com','imnoob501050@gmail.com','willamemi7@gmail.com'}
def canon(e):
    l,d=e.split('@'); l=l.split('+')[0]
    if d in('gmail.com','googlemail.com'): l=l.replace('.',''); d='gmail.com'
    return l+'@'+d
seen=set()
mxc={}
def has_mx(d):
    if d in mxc: return mxc[d]
    try:
        q=urllib.request.Request('https://cloudflare-dns.com/dns-query?'+urllib.parse.urlencode({'name':d,'type':'MX'}),headers={'accept':'application/dns-json'})
        j=json.load(urllib.request.urlopen(q,timeout=6)); v=j.get('Status')==0 and any(a.get('type')==15 for a in j.get('Answer',[]))
    except Exception: v=None
    mxc[d]=v; return v
why=collections.Counter(); seg=[]; stats=collections.Counter()
for r in rows:
    e=r['email'] or ''; d=e.split('@')[-1]; reason=None
    k=canon(e) if '@' in e else e; dupe=k in seen; seen.add(k)
    if r['runs']>0: stats['ran_at_least_once']+=1
    if r['is_admin']: reason='admin'
    elif OWN.search(e): reason='own/QA account'
    elif r['plan']!='free' or r['active_sub'] or r['override']: reason='Pro/paid (plan, active sub or override)'
    elif r['runs']>0: reason='already ran a prompt'
    elif r['unsub']: reason='unsubscribed'
    elif not r['confirmed']: reason='email unconfirmed'
    elif r['id'] in fake: reason='suspected fake (fake_accounts report 30/10)'
    elif r['disp'] or d in disp or any(d.endswith('.'+x) for x in disp): reason='disposable domain'
    elif e in bounced: reason='hard bounce'
    elif FAKE.search(e): reason='fake-looking address'
    elif not re.match(r'^[^@\s]+@[a-z0-9.-]+\.[a-z]{2,}$',e): reason='invalid address'
    elif dupe: reason='gmail alias duplicate'
    elif r['last_sign_in_at'] is None: reason='never signed in'
    elif has_mx(d) is False: reason='no MX'
    if reason: why[reason]+=1; continue
    seg.append(r)
print('exclusions',dict(why.most_common()))
print('stats',dict(stats))
print('SEGMENT',len(seg))
c=collections.Counter()
for r in seg:
    c['lib>0' if r['lib'] else 'lib0']+=1
    c['onehack' if r['ch']=='ONEHACK' else 'nochannel']+=1
    c['signup '+r['created_at'][:7]]+=1
    camps=r['camps'] or ''
    c['got welcome100' if 'welcome100' in camps else 'no welcome100']+=1
    c['got early_access' if 'early_access' in camps else 'no early_access']+=1
    c['has_name' if (r['nm'] or '').strip() and '@' not in (r['nm'] or '') else 'no_name']+=1
    tld=e.rsplit('.',1)[-1]
    c['tld .'+r['email'].rsplit('.',1)[-1]]+=1
for k,v in sorted(c.items()): print(k,v)
with open('segment_activation.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['id','email','first_name','signup_channel','created_at'])
    for r in seg:
        nm=(r['nm'] or '').strip(); tok=nm.split()[0] if nm else ''
        first=tok.title() if tok and '@' not in tok and re.match(r"^[A-Za-zÀ-ÿ'-]{2,}$",tok) else ''
        w.writerow([r['id'],r['email'],first,r['ch'] or '',r['created_at'][:10]])
import os; os.chmod('segment_activation.csv',0o600)
