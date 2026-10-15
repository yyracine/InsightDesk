use crate::models::{AppSettings, AssistantMessage, Dataset};
use anyhow::{anyhow, Result};
use chrono::Utc;
use serde_json::json;

pub async fn query_llm_api(
    query: &str,
    dataset: &Dataset,
    settings: &AppSettings,
    api_key: &str,
) -> Result<AssistantMessage> {
    let endpoint = settings
        .ai_endpoint
        .as_deref()
        .unwrap_or("https://api.openai.com/v1/chat/completions");

    let model = settings
        .ai_model
        .as_deref()
        .unwrap_or("gpt-4o-mini");

    // Build context summary without leaking excessive raw data
    let col_names: Vec<String> = dataset.columns.iter().map(|c| c.name.clone()).collect();
    let sample_rows: Vec<String> = dataset
        .rows
        .iter()
        .take(5)
        .map(|r| format!("{:?}", r.values))
        .collect();

    let system_prompt = format!(
        "Tu es l'analyste BI de l'application InsightDesk. Tu réponds de manière rigoureuse, professionnelle et concise en français. Tu t'appuies STRICTEMENT sur les données fournies et n'inventes JAMAIS de chiffres.\nJeu de données: '{}' ({} lignes, colonnes: {}).\nExemples d'enregistrements: {}",
        dataset.name,
        dataset.rows.len(),
        col_names.join(", "),
        sample_rows.join(" | ")
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let body = json!({
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ],
        "temperature": 0.2,
        "max_tokens": 1000
    });

    let res = client
        .post(endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| anyhow!("Erreur de communication avec le fournisseur IA: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_text = res.text().await.unwrap_or_default();
        return Err(anyhow!("Erreur API ({}): {}", status, err_text));
    }

    let json_resp: serde_json::Value = res.json().await?;
    let reply = json_resp["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| anyhow!("Format de réponse IA inattendu."))?
        .to_string();

    Ok(AssistantMessage {
        role: "assistant".to_string(),
        content: reply,
        sources: vec![
            format!("Modèle IA externe ({})", model),
            format!("Jeu de données : {}", dataset.name),
        ],
        is_deterministic: false,
        timestamp: Utc::now().to_rfc3339(),
    })
}
