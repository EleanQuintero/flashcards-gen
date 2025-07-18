import { useEffect, useRef } from "react";
import { useFlashCardsStore } from "@/app/dashboard/flashcards/store/flashCardsStore";
import { flashcardUnitOfWork } from "@/utils/services/unitOfWork/flashcardUnitOfWork"
import { UserSessionService } from "@/utils/services/userSession/userSessionService"; 

const SYNC_INTERVAL = 30000; // 30 segundos
const DIRTY_CHECK_INTERVAL = 5000; // 5 segundos

export const useFlashcardSync = (user_id: string) => {
  const syncInProgress = useRef(false);
  const isDirty = useFlashCardsStore((state) => state.isDirty)
  const lastSyncTimestamp = useFlashCardsStore((state) => state.lastSyncTimestamp)
  const userSessionService = UserSessionService.getInstance()
  

  useEffect(() => {

    if(!user_id) return

    //Verificamos el cambio de usuario al inicio
    if(userSessionService.hasUserChanged(user_id)){
      console.log("cambio de usuario detectado en el hook de sincronizacion")
    }

    const shouldSync = () => {
      const timeSinceLastSync = Date.now() - lastSyncTimestamp;
      return isDirty && timeSinceLastSync >= SYNC_INTERVAL;
    };

    const sync = async () => {
      if (syncInProgress.current || !shouldSync()) return;

      try {
        syncInProgress.current = true;
        await flashcardUnitOfWork.commit(user_id);
      } catch (error) {
        console.error("Error durante la sincronizacion: ", error);
      } finally {
        syncInProgress.current = false;
      }
    };

    const checkInterval = setInterval(() => {
      if (shouldSync()) {
        sync();
      }
    }, DIRTY_CHECK_INTERVAL);

    // Sincronizacion de emergencia al cerrar
    const handleBeforeUnload = async () => {
      if (isDirty) {
        try {
          await flashcardUnitOfWork.commit(user_id);
        } catch (error) {
          console.error("Error durante sincronizacion de emergencia: ", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user_id, isDirty, lastSyncTimestamp, userSessionService]);
};
