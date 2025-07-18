import { useUser } from "@clerk/nextjs";
import { useFlashcardSync } from "@/hooks/useFlashcardSync";
import SyncIndicator  from "../../../../../components/ui/sync-indicator";
import { usePing } from "@/hooks/usePing";
import LoadingModal from "../../../../../components/fallbacks/LoadingModal";
import { FlashCardGenerator } from "./FlashCardGenerator";
import { useUIState } from "@/store/uiState/uiState";

export const Generator = () => {
  const { user, isLoaded } = useUser();
  const user_id = user?.id;
  const { loading } = useUIState()

  // Iniciar sincronización
  usePing();
  useFlashcardSync(user_id as string);

  // Mostrar mensaje de carga si el usuario aún no está listo
  if (!isLoaded || !user || !user.id) {
    return <LoadingModal message="Cargando usuario..." isLoading={loading}/>
  }


  if(loading) {
    return (
      <LoadingModal
          isLoading={loading}
          message="Processing your request..."
          theme={{
            container: "bg-gradient-to-br from-blue-950 via-slate-900 to-black",
            spinner: "border-slate-700/40 border-t-blue-500",
            message: "from-blue-300 via-cyan-200 to-blue-300",
          }}
          size="md"
          spinnerType="ring"
          showClose={true}
          blur={true}
        />
    )
  }

  return (
    <section className="flex flex-row items-center justify-center rounded-lg w-full mt-auto text-xl">
        <FlashCardGenerator
          user={user}
          loadingAnswers={loading}
        />
      <SyncIndicator />
    </section>
  );
};
