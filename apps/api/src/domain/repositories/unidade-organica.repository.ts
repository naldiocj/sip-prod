export interface UnidadeOrganicaRepository {
  findById(id: string): Promise<{ id: string; codigo: string; nome: string } | null>;
  findByCodigo(codigo: string): Promise<{ id: string; codigo: string; nome: string } | null>;
}
