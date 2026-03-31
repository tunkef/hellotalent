#!/bin/bash
# Agent Metrics — Tum agent'larin token/maliyet takibi
# Her review/brief/call sonrasi otomatik loglanir
# Kullanim:
#   ./scripts/agent-metrics.sh log <agent> <input_tokens> <output_tokens> <cost>
#   ./scripts/agent-metrics.sh report
#   ./scripts/agent-metrics.sh today
#   ./scripts/agent-metrics.sh reset

set -euo pipefail
cd "$(dirname "$0")/.."

METRICS_FILE="reviews/agent-metrics.csv"
mkdir -p reviews

# CSV header yoksa olustur
if [ ! -f "$METRICS_FILE" ]; then
  echo "timestamp,agent,input_tokens,output_tokens,cost_usd,model" > "$METRICS_FILE"
fi

case "${1:-help}" in
  log)
    AGENT="${2:-unknown}"
    INPUT="${3:-0}"
    OUTPUT="${4:-0}"
    COST="${5:-0}"
    MODEL="${6:-unknown}"
    echo "$(date '+%Y-%m-%d %H:%M:%S'),$AGENT,$INPUT,$OUTPUT,$COST,$MODEL" >> "$METRICS_FILE"
    ;;

  today)
    echo "=== Bugunun Metrikleri ==="
    TODAY=$(date '+%Y-%m-%d')
    if grep -q "$TODAY" "$METRICS_FILE" 2>/dev/null; then
      echo ""
      echo "Agent          | Input    | Output   | Maliyet"
      echo "---------------|----------|----------|--------"
      grep "$TODAY" "$METRICS_FILE" | awk -F',' '{
        agent[$2] += 1;
        input[$2] += $3;
        output[$2] += $4;
        cost[$2] += $5;
      } END {
        total_cost = 0;
        for (a in agent) {
          printf "%-15s| %8d | %8d | $%.4f (%d call)\n", a, input[a], output[a], cost[a], agent[a];
          total_cost += cost[a];
        }
        printf "%-15s| %8s | %8s | $%.4f\n", "TOPLAM", "—", "—", total_cost;
      }'
    else
      echo "Bugun henuz metrik yok."
    fi
    ;;

  report)
    echo "=== Tum Zamanlar Raporu ==="
    if [ -f "$METRICS_FILE" ] && [ $(wc -l < "$METRICS_FILE") -gt 1 ]; then
      echo ""
      tail -n +2 "$METRICS_FILE" | awk -F',' '{
        agent[$2] += 1;
        input[$2] += $3;
        output[$2] += $4;
        cost[$2] += $5;
      } END {
        total_cost = 0;
        total_calls = 0;
        printf "Agent          | Calls | Input      | Output     | Toplam Maliyet\n";
        printf "---------------|-------|------------|------------|---------------\n";
        for (a in agent) {
          printf "%-15s| %5d | %10d | %10d | $%.4f\n", a, agent[a], input[a], output[a], cost[a];
          total_cost += cost[a];
          total_calls += agent[a];
        }
        printf "%-15s| %5d | %10s | %10s | $%.4f\n", "TOPLAM", total_calls, "—", "—", total_cost;
        printf "\nKalan butce (tahmini): DeepSeek $%.2f / Grok $%.2f\n", 20-cost["deepseek"], 25-cost["grok"];
      }'
    else
      echo "Henuz metrik yok."
    fi
    ;;

  reset)
    echo "timestamp,agent,input_tokens,output_tokens,cost_usd,model" > "$METRICS_FILE"
    echo "Metrikler sifirlandi."
    ;;

  *)
    echo "Agent Metrics — Token & Maliyet Takibi"
    echo ""
    echo "  $0 log <agent> <in> <out> <cost> [model]  Metrik kaydet"
    echo "  $0 today                                   Bugunun ozeti"
    echo "  $0 report                                  Tum zamanlar"
    echo "  $0 reset                                   Sifirla"
    ;;
esac
