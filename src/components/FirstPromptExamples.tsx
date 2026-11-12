type Props = { isEnglish: boolean; onSelect: (example: string) => void };

export function FirstPromptExamples({ isEnglish, onSelect }: Props) {
  const examples = isEnglish ? [
    ['Real estate', 'Write a professional property description for a two-bedroom apartment in Lisbon, highlighting its terrace and nearby transport.'],
    ['Marketing', 'Create a week of social media ideas for a local café, including the audience and a suggested format for each post.'],
    ['Small business', 'Draft a polite email announcing updated opening hours to customers of a small shop.'],
  ] : [
    ['Imobiliário', 'Escreva uma descrição profissional para um imóvel T2 em Lisboa, destacando o terraço e os transportes próximos.'],
    ['Marketing', 'Crie ideias para uma semana de publicações nas redes sociais de um café local, indicando o público e o formato de cada uma.'],
    ['Pequeno negócio', 'Redija um email cordial a anunciar o novo horário de uma pequena loja aos seus clientes.'],
  ];
  return <details className="rounded-lg border border-border bg-muted/20 p-4" data-testid="first-prompt-examples">
    <summary className="cursor-pointer font-medium text-sm">{isEnglish ? 'Need inspiration? Choose an example' : 'Precisa de inspiração? Escolha um exemplo'}</summary>
    <p className="mt-2 text-sm text-muted-foreground">{isEnglish ? 'Choose an idea, adapt it below and generate your prompt. You can also start from scratch.' : 'Escolha uma ideia, adapte-a abaixo e gere o seu prompt. Também pode começar do zero.'}</p>
    <div className="mt-3 flex flex-wrap gap-2">{examples.map(([label, example]) => <button key={label} type="button" className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSelect(example)}>{label}</button>)}</div>
  </details>;
}
