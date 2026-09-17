import { useCallback, useState } from "react";
import { askNlQuery } from "../api/nl-query.service";
import type {
  ChartType,
  QueryEnvelope,
  TurnLogEntry,
  UiTurn,
} from "../types/nl-query.types";

export function useNlQuery() {
  const [turns, setTurns] = useState<UiTurn[]>([]);
  const [turnsLog, setTurnsLog] = useState<TurnLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const ask = useCallback(
    async (
      question: string,
      chart?: ChartType,
    ): Promise<QueryEnvelope | null> => {
      setLoading(true);
      setError(null);
      try {
        const envelope = await askNlQuery({
          question,
          preferredChartType: chart,
          history: turns,
        });
        const isResult =
          envelope.answer_type === undefined ||
          envelope.answer_type === "result";
        setTurnsLog((log) => [...log, { question, envelope }]);
        setTurns((prev) => [
          ...prev,
          {
            question,
            answerType: envelope.answer_type ?? "result",
            sql: isResult ? envelope.sql : null,
            rowCount: envelope.row_count,
          },
        ]);
        return envelope;
      } catch (thrown) {
        setError(thrown);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [turns],
  );

  const reset = useCallback(() => {
    setTurns([]);
    setTurnsLog([]);
    setError(null);
  }, []);

  return { ask, turnsLog, loading, error, reset };
}
