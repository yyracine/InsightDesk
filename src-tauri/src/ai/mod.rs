pub mod local_assistant;
pub mod openai_client;

use crate::models::{AppSettings, AssistantMessage, Dataset};

pub async fn answer_query(
    query: &str,
    dataset: &Dataset,
    settings: &AppSettings,
    api_key: Option<&str>,
) -> AssistantMessage {
    if settings.ai_provider == "openai_compatible" {
        let env_key = std::env::var("OPENAI_API_KEY").ok();
        let key_resolved = api_key
            .or(settings.ai_api_key.as_deref())
            .or(env_key.as_deref());

        if let Some(key) = key_resolved {
            if !key.trim().is_empty() {
                match openai_client::query_llm_api(query, dataset, settings, key).await {
                    Ok(msg) => return msg,
                    Err(err) => {
                        let mut local_resp = local_assistant::answer_query_locally(query, dataset);
                        local_resp.content = format!(
                            "> [!WARNING] Échec de l'appel au modèle distant ({}), bascule automatique sur le moteur déterministe local :\n\n{}",
                            err, local_resp.content
                        );
                        return local_resp;
                    }
                }
            }
        }
    }

    // Default: Local deterministic assistant
    local_assistant::answer_query_locally(query, dataset)
}
