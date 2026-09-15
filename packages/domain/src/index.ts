export type User = {
  id: string;
  email: string;
  name: string;
  unidadeOrganicaId: string | null;
};

export type UnidadeOrganica = {
  id: string;
  nome: string;
  codigo: string;
};
