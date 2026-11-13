import assignment from "./lab-1/assignment.md?raw";
import variants from "./lab-1/variants.json";

/** Словарь вариантов лабораторной: номера вариантов + вид и язык работы. */
export interface LabVariant {
  /** Номера вариантов, которым соответствует этот словарь. */
  variants: number[];
  /** Вид работы. */
  вид: string;
  /** Язык. */
  язык: string;
}

/** Лабораторная работа: текст задания (MD) и словари вариантов. */
export interface LabDefinition {
  /** Номер лабораторной (вкладка в шапке). */
  number: number;
  /** Полное название. */
  title: string;
  /** Текст задания в Markdown. */
  assignment: string;
  /** Словари вариантов; конкретный вариант ищется по полю variants. */
  variants: LabVariant[];
}

export const labs: LabDefinition[] = [
  {
    number: 1,
    title: "Инвертированный индекс и словарь",
    assignment,
    variants,
  },
];

/** Все номера вариантов лабы по возрастанию — пункты селекта в шапке. */
export function getVariantNumbers(lab: LabDefinition): number[] {
  return [...new Set(lab.variants.flatMap((entry) => entry.variants))].sort((a, b) => a - b);
}

/** Словарь, которому соответствует данный номер варианта. */
export function getVariantInfo(lab: LabDefinition, variant: number): LabVariant | undefined {
  return lab.variants.find((entry) => entry.variants.includes(variant));
}
