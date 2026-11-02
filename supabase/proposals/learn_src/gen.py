import json, re, sys
sys.path.insert(0, '.')
from l1 import L1
from l2 import L2
from l3 import L3
LESSONS = L1 + L2 + L3

# Per-lesson label overrides where the pack label doesn't fit the lesson's meaning.
O = {
 'formato-certo': {'pt': {'numero': ['Máximo de caracteres', 'Ex.: 150'], 'tarefa': ['O que queres escrever', 'Ex.: o texto de um anúncio']},
                   'en': {'number': ['Character limit', 'e.g. 150'], 'task': ['What you want written', 'e.g. ad copy']}},
 'anatomia-prompt': {'pt': {'tarefa': ['O que queres que a IA faça', 'Ex.: 3 legendas para Instagram sobre o novo bolo']},
                     'en': {'task': ['What you want the AI to do', 'e.g. 3 Instagram captions about our new cake']}},
 'contexto-negocio': {'pt': {'notas': ['O que nunca dizer', 'Ex.: prometer resultados'], 'oferta': ['O que te distingue', 'Ex.: entregas no próprio dia'], 'tarefa': ['Tarefa', 'Ex.: um email a anunciar a promoção de novembro']},
                      'en': {'notes': ['What never to say', 'e.g. promising results'], 'offer': ['What sets you apart', 'e.g. same-day delivery'], 'task': ['Task', 'e.g. an email announcing the November offer']}},
 'iterar': {'pt': {'referencia': ['O que manter', 'Ex.: a abertura e a lista de serviços'], 'instrucoes': ['O que mudar', 'Ex.: cortar para metade e terminar com uma pergunta']},
            'en': {'reference': ['What to keep', 'e.g. the opening and the list of services'], 'instructions': ['What to change', 'e.g. cut it in half and end with a question']}},
 'erros-comuns': {'pt': {'tarefa': ['O que queres escrever', 'Ex.: um post sobre a clínica'], 'dados': ['Os teus dados reais', 'Ex.: 4,8 estrelas, 212 avaliações, desde 2015']},
                  'en': {'task': ['What you want written', 'e.g. a post about the clinic'], 'data': ['Your real data', 'e.g. 4.8 stars, 212 reviews, since 2015']}},
 'ganchos-reels': {'pt': {'tema': ['Tema do vídeo', 'Ex.: como escolher café em grão'], 'plataforma': ['Plataforma', 'Ex.: Instagram Reels']},
                   'en': {'topic': ['Video topic', 'e.g. how to choose coffee beans'], 'platform': ['Platform', 'e.g. Instagram Reels']}},
 'anuncios-ab': {'pt': {'tema': ['O que vais testar', 'Ex.: a promessa principal'], 'opcao_a': ['Foco da versão A', 'Ex.: sem fidelização'], 'opcao_b': ['Foco da versão B', 'Ex.: aulas de grupo incluídas'], 'acao': ['Apelo à ação', 'Ex.: Marca a tua aula grátis']},
                 'en': {'topic': ['What you are testing', 'e.g. the main promise'], 'option_a': ['Version A focus', 'e.g. no contract'], 'option_b': ['Version B focus', 'e.g. group classes included'], 'action': ['Call to action', 'e.g. Book your free class']}},
 'avaliacoes-google': {'pt': {'numero': ['Estrelas', 'Ex.: 2'], 'nome': ['Assinatura', 'Ex.: Rui, gerente'], 'contexto': ['O que aconteceu', 'Ex.: tínhamos menos uma pessoa na cozinha']},
                       'en': {'number': ['Stars', 'e.g. 2'], 'name': ['Sign-off', 'e.g. Tom, manager'], 'context': ['What happened', 'e.g. the kitchen was one person short']}},
 'newsletter-mensal': {'pt': {'data': ['Mês', 'Ex.: dezembro'], 'tema': ['Dica útil', 'Ex.: como escolher mel cru'], 'contexto': ['Bastidores', 'Ex.: nova parceria com um produtor local'], 'oferta': ['Oferta ou convite', 'Ex.: 10% nos cabazes até dia 15']},
                       'en': {'date': ['Month', 'e.g. December'], 'topic': ['Useful tip', 'e.g. how to choose raw honey'], 'context': ['Behind the scenes', 'e.g. new partnership with a local producer'], 'offer': ['Offer or invitation', 'e.g. 10% off hampers until the 15th']}},
 'propostas-orcamentos': {'pt': {'notas': ['Notas da reunião', 'Cola aqui as tuas notas'], 'preco': ['Preço da opção base', 'Ex.: 1200 €'], 'data_fim': ['Prazo final', 'Ex.: fim de fevereiro']},
                          'en': {'notes': ['Meeting notes', 'Paste your notes here'], 'price': ['Base option price', 'e.g. £1,200'], 'end_date': ['Final deadline', 'e.g. end of February']}},
 'follow-up-clientes': {'pt': {'situacao': ['O que enviaste', 'Ex.: proposta de 900 € para um catálogo'], 'numero': ['Dias sem resposta', 'Ex.: 8'], 'notas': ['O que sabes do cliente', 'Ex.: disse que o orçamento estava apertado'], 'opcao_b': ['Alternativa a oferecer', 'Ex.: versão mais simples por 600 €']},
                        'en': {'situation': ['What you sent', 'e.g. a 900-pound catalogue proposal'], 'number': ['Days without reply', 'e.g. 8'], 'notes': ['What you know about the client', 'e.g. said the budget was tight'], 'option_b': ['Alternative to offer', 'e.g. a simpler version for 600 pounds']}},
 'anuncio-imovel': {'pt': {'notas': ['Pontos fortes reais', 'Ex.: varanda a sul, cozinha remodelada'], 'cliente_ideal': ['Comprador ideal', 'Ex.: casal jovem que trabalha em Lisboa'], 'plataforma': ['Portal', 'Ex.: Idealista']},
                    'en': {'notes': ['Real selling points', 'e.g. south-facing balcony, new kitchen'], 'ideal_client': ['Ideal buyer', 'e.g. young couple commuting to London'], 'platform': ['Portal', 'e.g. Rightmove'], 'location': ['Area', 'e.g. East Croydon']}},
 'leads-imobiliario': {'pt': {'mensagem': ['Pedido recebido', 'Cola aqui a mensagem (sem dados pessoais)'], 'notas': ['Dados do imóvel', 'Ex.: condomínio 35 €/mês, livre em fevereiro'], 'plataforma': ['Canal', 'Ex.: WhatsApp'], 'horario': ['Dois horários de visita', 'Ex.: quinta 18h30 ou sábado 11h']},
                       'en': {'message': ['Enquiry received', 'Paste the message (no personal data)'], 'notes': ['Property details', 'e.g. service charge £90/month, chain-free'], 'platform': ['Channel', 'e.g. WhatsApp'], 'hours': ['Two viewing slots', 'e.g. Thu 6.30pm or Sat 11am']}},
 'anuncio-alojamento': {'pt': {'notas': ['Factos e comodidades', 'Ex.: Wi-Fi 500 Mb, secretária, estacionamento grátis'], 'plataforma': ['Plataforma', 'Ex.: Airbnb'], 'tipologia': ['Tipo de alojamento', 'Ex.: apartamento T1']},
                        'en': {'notes': ['Facts and amenities', 'e.g. 500 Mb Wi-Fi, desk, free parking'], 'platform': ['Platform', 'e.g. Airbnb'], 'property_type': ['Property type', 'e.g. one-bedroom flat']}},
 'mensagens-hospedes': {'pt': {'notas': ['Chegada e estacionamento', 'Ex.: parque do Rossio, 5 minutos a pé'], 'referencia': ['As tuas 3 recomendações', 'Ex.: Fialho, Botequim da Mouraria, Dom Joaquim'], 'tipologia': ['Tipo de alojamento', 'Ex.: casa para 4 pessoas']},
                        'en': {'notes': ['Arrival and parking', "e.g. Marygate car park, 5 minutes' walk"], 'reference': ['Your 3 recommendations', 'e.g. three local restaurants'], 'property_type': ['Property type', 'e.g. house for 4']}},
 'exemplos-no-prompt': {'pt': {'referencia': ['Exemplo 1', 'Cola aqui um texto teu que funcionou'], 'rascunho': ['Exemplo 2', 'Cola aqui outro texto teu'], 'produto': ['Para o que queres escrever', 'Ex.: prato de faiança azul, 27 cm']},
                        'en': {'reference': ['Example 1', 'Paste one of your texts that worked'], 'draft': ['Example 2', 'Paste another of your texts'], 'product': ['What to write for', 'e.g. blue earthenware plate, 27 cm']}},
 'criar-template': {'pt': {'numero': ['Máximo de palavras', 'Ex.: 120']}, 'en': {'number': ['Word limit', 'e.g. 120']}},
 'prompts-imagens': {'pt': {'produto': ['Produto', 'Ex.: garrafa de azeite em vidro verde-escuro'], 'contexto': ['Cenário', 'Ex.: mesa de madeira, cozinha rústica'], 'luz': ['Luz', 'Ex.: luz natural da manhã, lateral'], 'proporcao': ['Proporção', 'Ex.: 4:5']},
                     'en': {'product': ['Product', 'e.g. dark green glass olive oil bottle'], 'context': ['Setting', 'e.g. wooden table, rustic kitchen'], 'light': ['Light', 'e.g. soft morning side light'], 'aspect_ratio': ['Aspect ratio', 'e.g. 4:5']}},
}

def load_maps():
    src = open('../../../src/lib/templateVariables.ts').read()
    pt = src.split('VAR_LABELS_EN')[0]; en = src.split('VAR_LABELS_EN')[1]
    k = lambda s: set(re.findall(r"^  ([a-z_]+): \[", s, re.M))
    return k(pt), k(en)

def body(l, lang):
    d = l[lang]; t = d['try_']
    return {"problem": d['problem'], "steps": d['steps'], "before": d['before'], "after": d['after'],
            "try": {"intro": t['intro'], "target": t['target'], "template": t['template'], "labels": O.get(l['slug'], {}).get(lang, {})},
            "checklist": d['checklist'], "tips": d['tips']}

def check():
    ptk, enk = load_maps(); errs = []
    slugs = [l['slug'] for l in LESSONS]; assert len(slugs) == len(set(slugs)) == 18, slugs
    for l in LESSONS:
        for lang, keys in (('pt', ptk), ('en', enk)):
            b = body(l, lang)
            assert len(b['steps']) == 3 and len(b['tips']) >= 2 and len(b['checklist']) >= 4, l['slug']
            for v in re.findall(r"\{\{(\w+)\}\}", b['try']['template']):
                if v not in keys and v not in b['try']['labels']:
                    errs.append(f"{l['slug']}/{lang}: {v}")
            txt = json.dumps(b, ensure_ascii=False)
            if re.search(r"\*\*|^#|`", txt): errs.append(f"{l['slug']}/{lang}: markdown")
    free = [l['slug'] for l in LESSONS if l['free']]
    print('free:', free); print('errors:', errs or 'none')
    return not errs

def q(s): return "'" + s.replace("'", "''") + "'"
def sql():
    out = ["-- Learn catalogue seed (generated by supabase/proposals/learn_src/gen.py). Idempotent upsert.", "begin;"]
    order_base = {'fundamentos': 0, 'setor': 100, 'avancado': 200}
    sec = {'marketing': 0, 'pme': 10, 'freelancers': 20, 'imobiliario': 30, 'hotelaria': 40}
    for l in LESSONS:
        so = order_base[l['track']] + (sec[l['sector']] if l['sector'] else 0) + l['order']
        out.append(f"""insert into public.learn_lessons (slug, track, sector, sort_order, is_free, duration_min, level, title_pt, title_en, summary_pt, summary_en, is_active)
values ({q(l['slug'])}, {q(l['track'])}, {q(l['sector']) if l['sector'] else 'null'}, {so}, {str(l['free']).lower()}, {l['dur']}, {q(l['level'])}, {q(l['pt']['title'])}, {q(l['en']['title'])}, {q(l['pt']['summary'])}, {q(l['en']['summary'])}, true)
on conflict (slug) do update set track=excluded.track, sector=excluded.sector, sort_order=excluded.sort_order, is_free=excluded.is_free, duration_min=excluded.duration_min, level=excluded.level, title_pt=excluded.title_pt, title_en=excluded.title_en, summary_pt=excluded.summary_pt, summary_en=excluded.summary_en, is_active=true, updated_at=now();""")
        out.append(f"""insert into public.learn_lesson_content (lesson_id, body_pt, body_en)
select id, {q(json.dumps(body(l,'pt'), ensure_ascii=False))}::jsonb, {q(json.dumps(body(l,'en'), ensure_ascii=False))}::jsonb from public.learn_lessons where slug = {q(l['slug'])}
on conflict (lesson_id) do update set body_pt=excluded.body_pt, body_en=excluded.body_en, updated_at=now();""")
    out.append("commit;")
    return "\n".join(out)

if __name__ == '__main__':
    if check():
        open('../20261027_learn_catalogue.sql', 'w').write(sql())
        wc = sum(len(json.dumps(body(l,'pt'),ensure_ascii=False).split()) for l in LESSONS)
        wce = sum(len(json.dumps(body(l,'en'),ensure_ascii=False).split()) for l in LESSONS)
        print('written; words pt', wc, 'en', wce)
