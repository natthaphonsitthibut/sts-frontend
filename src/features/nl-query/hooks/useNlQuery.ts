import { useCallback, useMemo, useRef, useState } from "react";
import { askNlQuery } from "../api/nl-query.service";
import type {
  ChartType,
  QueryEnvelope,
  TurnLogEntry,
  UiTurn,
} from "../types/nl-query.types";

function toTurn({ question, envelope }: TurnLogEntry): UiTurn {
  const isResult =
    envelope.answer_type === undefined || envelope.answer_type === "result";
  return {
    question,
    answerType: envelope.answer_type ?? "result",
    sql: isResult ? envelope.sql : null,
    rowCount: envelope.row_count,
  };
}

export function useNlQuery() {
  const [turnsLog, setTurnsLog] = useState<TurnLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const sessionRef = useRef(0);

  const turns = useMemo(() => turnsLog.map(toTurn), [turnsLog]);

  const ask = useCallback(
    async (
      question: string,
      chart?: ChartType,
    ): Promise<QueryEnvelope | null> => {
      const session = sessionRef.current;
      setLoading(true);
      setError(null);
      try {
        const envelope = await askNlQuery({
          question,
          preferredChartType: chart,
          history: turns,
        });
        if (sessionRef.current !== session) {
          // reset() ran while this request was in flight; discard it.
          return null;
        }
        setTurnsLog((log) => [...log, { question, envelope }]);
        return envelope;
      } catch (thrown) {
        if (sessionRef.current === session) {
          setError(thrown);
        }
        return null;
      } finally {
        if (sessionRef.current === session) {
          setLoading(false);
        }
      }
    },
    [turns],
  );

  const reset = useCallback(() => {
    sessionRef.current += 1;
    setTurnsLog([]);
    setError(null);
    setLoading(false);
  }, []);

  return { ask, turnsLog, loading, error, reset };
}
