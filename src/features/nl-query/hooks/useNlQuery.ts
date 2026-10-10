import { useCallback, useRef, useState } from "react";
import { askNlQuery, getNlConversation } from "../api/nl-query.service";
import type {
  ChartType,
  NlQueryResponse,
  TurnLogEntry,
} from "../types/nl-query.types";

export function useNlQuery() {
  const [turnsLog, setTurnsLog] = useState<TurnLogEntry[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const sessionRef = useRef(0);

  const ask = useCallback(
    async (
      question: string,
      chart?: ChartType,
    ): Promise<NlQueryResponse | null> => {
      const session = sessionRef.current;
      setLoading(true);
      setError(null);
      try {
        const envelope = await askNlQuery({
          question,
          preferredChartType: chart,
          conversationId: conversationId ?? undefined,
        });
        if (sessionRef.current !== session) {
          // reset()/load() ran while this request was in flight; discard it.
          return null;
        }
        setTurnsLog((log) => [...log, { question, envelope }]);
        if (envelope.conversation_id) {
          setConversationId(envelope.conversation_id);
        }
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
    [conversationId],
  );

  /** Opens a stored conversation. Returns false if it could not be loaded. */
  const load = useCallback(async (id: string): Promise<boolean> => {
    // A load supersedes any in-flight ask/load.
    sessionRef.current += 1;
    const session = sessionRef.current;
    setLoading(true);
    setError(null);
    try {
      const detail = await getNlConversation(id);
      if (sessionRef.current !== session) return false;
      setTurnsLog(
        detail.turns.map(({ question, envelope }) => ({ question, envelope })),
      );
      setConversationId(id);
      return true;
    } catch (thrown) {
      if (sessionRef.current === session) {
        setError(thrown);
      }
      return false;
    } finally {
      if (sessionRef.current === session) {
        setLoading(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    sessionRef.current += 1;
    setTurnsLog([]);
    setConversationId(null);
    setError(null);
    setLoading(false);
  }, []);

  return { ask, load, turnsLog, conversationId, loading, error, reset };
}
