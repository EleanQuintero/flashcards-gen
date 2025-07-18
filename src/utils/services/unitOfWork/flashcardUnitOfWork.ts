import { FlashcardRepository } from "@/infrastructure/flashcardRepository";
import { useFlashCardsStore } from "@/app/dashboard/flashcards/store/flashCardsStore";
import { NativeCacheService } from "../cache/nativeCacheService";
import { AnswerData, flashcard, getAnswersProps } from "@/domain/flashcards";
import { UserSessionService } from "../userSession/userSessionService";
import { retryFetchData } from "../functions/process/retryFetchData";


const repository = new FlashcardRepository();
const cacheService = NativeCacheService.getInstance();
const userSessionService = UserSessionService.getInstance();

export const flashcardUnitOfWork = {
  async _fetchAndSyncFlashcards(user_id: string) {
    const flashcards = await repository.getAllFlashcards(user_id);
    await cacheService.setCache(user_id, flashcards);
    useFlashCardsStore.getState().setConsolidatedFlashcards(flashcards);
    return flashcards;
  },

  async _firstClean(user_id: string): Promise<boolean> {
    try {
        const firstInit = sessionStorage.getItem("app_initialized")
    
        if(!firstInit) {
            cacheService.clearCache(user_id);
            useFlashCardsStore.getState().clearAllData();
            localStorage.removeItem("flashcards-cache");
            localStorage.removeItem("flashcard-consolidated");
            sessionStorage.setItem("app_initialized", "true");

            return true
        } else {
            return false
        }
        
        
    } catch (error) {
        console.error("Error during first clean:", error);
        return false
    }
  },

  async commit(user_id: string): Promise<void> {
    const state = useFlashCardsStore.getState();

    if (!state.isDirty) return; // No hay cambios para sincronizar

    // Obtenemos las nuevas flashcards
    const newFlashCards = state.getNewFlashcardsForSync(user_id);

    if (newFlashCards.flashcard.length === 0) return; // Nada que sincronizar

    try {
      await repository.saveFlashcards(newFlashCards);
      state.markAsSynced();
    } catch (error) {
      console.error("Error durante la sincronizacion:", error);
      state.markAsSynced();
      throw error;
      // No se marca como sincronizado si falla
    }
  },

  async loadUserFlashCards(user_id: string): Promise<flashcard[]> {
    await this._firstClean(user_id)
    await this._handleUserChange(user_id);
    
    // Obtener el estado actual del store
    const currentState = useFlashCardsStore.getState();

    // DECISIÓN 1: Verificar si ya hay flashcards en el estado consolidado
    if (currentState.consolidatedFlashCards.length > 0) {
      return currentState.consolidatedFlashCards;
    }

    // DECISIÓN 2: Solo cargar desde cache/API si el estado está vacío

    // Intentar cargar desde cache primero
    const cached = await cacheService.getCache(user_id);
    if (cached) {
      useFlashCardsStore.getState().setConsolidatedFlashcards(cached);
      return cached;
    }

    // Si no hay cache, cargar desde la API
   
    const flashcards = await retryFetchData(() => this._fetchAndSyncFlashcards(user_id));
    return flashcards;
  },

  async _handleUserChange(newUserId: string): Promise<void> {
    if (userSessionService.hasUserChanged(newUserId)) {
      const previousUserId = userSessionService.getPreviousUserId();

      if (previousUserId) {
        //Limpiamos el estado del store
        useFlashCardsStore.getState().clearAllData();

        //Limpiar datos del usuario anterior
        await userSessionService.cleanupPreviousUserData(previousUserId);
      }

      //Actualizamos sesion del nuevo usuario
      userSessionService.updateUserSession(newUserId);
    }
  },

  async getAnswers ({ theme, userLevel, questions }: getAnswersProps): Promise<AnswerData> {
    try {
      const answer = await repository.getModelAnswer({ theme, userLevel, questions });
      return answer;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Error desconocido al obtener respuestas");
    }
  },

  async deleteFlashcard(user_id: string,id: string): Promise<void> {  
    try {
      const response = await repository.deleteFlashcard(user_id, id );
      return response
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Error desconocido al eliminar flashcard");
    }
    }
    }

