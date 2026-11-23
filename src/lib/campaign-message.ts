export const renderMessage = (tpl: string, vars: { prenom: string; commerce: string }) =>
  tpl.replaceAll("{prenom}", vars.prenom).replaceAll("{commerce}", vars.commerce);
