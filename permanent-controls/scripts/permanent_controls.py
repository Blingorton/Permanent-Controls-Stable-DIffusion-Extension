import gradio as gr
import modules.scripts as scripts
from modules.ui import create_output_panel


class PermanentControlsScript(scripts.Script):
    """
    Permanent Interrupt & Skip buttons for Stable Diffusion Reforge.
    These buttons always remain visible regardless of generation state,
    solving the 'stuck on Generate button' issue during Generate Forever.
    """

    def title(self):
        return "Permanent Controls"

    def show(self, is_img2img):
        return scripts.AlwaysVisible

    def ui(self, is_img2img):
        # The actual buttons are injected via JavaScript.
        # This script just needs to exist to load the JS.
        return []
