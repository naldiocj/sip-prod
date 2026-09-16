import { describe, expect, it } from "vitest";
import {
  ActoPiquete,
  EstadoActo,
  EstadoPeca,
  EstadoProcesso,
  FormatoInvalidoError,
  HashDocumento,
  NumeroProcesso,
  OrigemProcesso,
  PecaProcessual,
  Processo,
  Tipicidade,
  TransicaoInvalidaError
} from "./index";

describe("NumeroProcesso", () => {
  it("normaliza um número válido", () => {
    const numero = NumeroProcesso.criar("sic/piq/lu/2026/000123");
    expect(numero.valor).toBe("SIC/PIQ/LU/2026/000123");
    expect(numero.ano).toBe(2026);
  });
  it("rejeita formatos inválidos", () => {
    expect(() => NumeroProcesso.criar("ABC-123")).toThrow(FormatoInvalidoError);
    expect(() => NumeroProcesso.criar("SIC/PIQ/LU/2026/123")).toThrow(FormatoInvalidoError);
  });
});

describe("Processo", () => {
  const criar = () =>
    Processo.instaurar({
      id: "p1",
      numeroProcesso: NumeroProcesso.gerar("PIQ", "LU", 2026, 1),
      origem: OrigemProcesso.PIQUETE_SIC,
      unidadeActualId: "u1",
      instauradoPor: "user1"
    });
  it("instaura em rascunho e publica evento", () => {
    const processo = criar();
    expect(processo.estado).toBe(EstadoProcesso.RASCUNHO);
    expect(processo.eventos[0].eventName).toBe("processo.instaurado");
  });
  it("impede distribuir duas vezes", () => {
    const processo = criar();
    processo.distribuirParaInstrutor("i1");
    expect(() => processo.distribuirParaInstrutor("i2")).toThrow(TransicaoInvalidaError);
  });
  it("permite remessa e registo na procuradoria", () => {
    const processo = criar();
    processo.distribuirParaInstrutor("i1");
    processo.remeterParaProcuradoria();
    processo.registarNumeroProcuradoria("proc/lu/2026/00123");
    expect(processo.estado).toBe(EstadoProcesso.EM_PROCURADORIA);
    expect(processo.numeroProcuradoria).toBe("PROC/LU/2026/00123");
  });
  it("exige fundamento para arquivar", () => {
    const processo = criar();
    expect(() => processo.arquivar("curto")).toThrow(TransicaoInvalidaError);
    processo.arquivar("Denúncia manifestamente infundada");
    expect(processo.estado).toBe(EstadoProcesso.ARQUIVADO);
  });
  it("rejeita transição a partir de processo arquivado", () => {
    const processo = criar();
    processo.arquivar("Denúncia manifestamente infundada");
    expect(() => processo.distribuirParaInstrutor("i1")).toThrow(TransicaoInvalidaError);
  });
});

describe("ActoPiquete", () => {
  const params = {
    id: "a1",
    tipoActoId: "tipo1",
    tipoActoCodigo: "AUTO",
    piqueteId: "piq1",
    userRegistoId: "u1",
    numeroActo: "A/1",
    factos: "Descrição factual suficientemente longa.",
    geraProcesso: true
  };
  it("emite evento quando gera processo", () => {
    const acto = ActoPiquete.criar(params);
    expect(acto.estado).toBe(EstadoActo.SUBMETIDO);
    expect(acto.eventos).toHaveLength(1);
  });
  it("rejeita factos insuficientes", () => {
    expect(() => ActoPiquete.criar({ ...params, factos: "curto" })).toThrow(TransicaoInvalidaError);
  });
  it("não publica evento quando não gera processo", () => {
    const acto = ActoPiquete.criar({ ...params, geraProcesso: false });
    expect(acto.eventos).toHaveLength(0);
  });
  it("valida e rejeita apenas a partir de submetido", () => {
    const acto = ActoPiquete.criar(params);
    acto.validar();
    expect(acto.estado).toBe(EstadoActo.VALIDADO);
    expect(() => acto.rejeitar("fundamento suficiente")).toThrow(TransicaoInvalidaError);
  });
});

describe("PecaProcessual", () => {
  const criar = () =>
    PecaProcessual.criar({
      id: "x",
      processoId: "p",
      templateId: "t",
      tipo: "auto",
      numeroOrdem: 1,
      dados: {},
      criadaPor: "u"
    });
  it("exige hash antes de assinar e torna-se imutável", () => {
    const peca = criar();
    expect(() => peca.assinar("u")).toThrow(TransicaoInvalidaError);
    peca.gerarPDF(HashDocumento.criar("a".repeat(64)), "/tmp/x.pdf");
    peca.assinar("u");
    expect(peca.estado).toBe(EstadoPeca.IMUTAVEL);
    expect(peca.estaImutavel()).toBe(true);
  });
  it("valida tipicidade e hash", () => {
    expect(Tipicidade.criar("furto_simples", "Furto simples", "234").codigo).toBe("FURTO_SIMPLES");
    expect(() => HashDocumento.criar("a".repeat(63))).toThrow(FormatoInvalidoError);
  });
  it("rejeita geração sem caminho PDF", () => {
    const peca = criar();
    expect(() => peca.gerarPDF(HashDocumento.criar("a".repeat(64)), "  ")).toThrow(
      TransicaoInvalidaError
    );
  });
  it("não permite alterar uma peça imutável", () => {
    const peca = criar();
    peca.gerarPDF(HashDocumento.criar("a".repeat(64)), "/tmp/x.pdf");
    peca.assinar("u");
    expect(() => peca.gerarPDF(HashDocumento.criar("b".repeat(64)), "/tmp/y.pdf")).toThrow(
      TransicaoInvalidaError
    );
  });
});
