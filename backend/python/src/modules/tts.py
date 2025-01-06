#file name en_us_hifi92_light_cpu.addon located under models/
import wave
from balacoon_tts import TTS
import time
# adjust the path to the addon based on the previous step
path = "models/en_us_hifi92_light_cpu.addon"
#path= "models/uk_ltm_jets_cpu.addon"
# path= "models/uk_tetiana_light_cpu.addon"

start = time.time()
tts = TTS( path )
supported_speakers = tts.get_speakers()
speaker = supported_speakers[-1]
# samples = tts.synthesize("Even though i sound like a stupid AI system; let me assure you; I am not ! I am instead quite sophisticated. Note that english is not my mother language.", speaker)
 
# save under tempdir/nice.wav
with wave.open ("/app/tempdir/nice.wav", "wb") as fp:
    fp.setparams((1, 2, tts.get_sampling_rate(), len(samples), "NONE", "NONE"))
    fp.writeframes(samples)

#streaminmg example
# from balacoon_tts import TTS, SpeechUtterance
# # create tts as before
# tts = TTS("path/to/en_us_cmuartic_jets_cpu.addon")
# # select speaker for synthesis
# supported_speakers = tts.get_speakers()
# speaker = supported_speakers[-1]
# # create an utterance, which will hold the syntheis state
# utterance = SpeechUtterance("hello world")
# # run synthesis in a loop
# while True:
#     samples = tts.synthesize_chunk(utterance, speaker)
#     if len(samples) == 0:
#         # all the samples were already generated
#         break
#     # send produced samples to the user,
#     # for example play them back.
#     playback(samples)

print(f"Time taken: {time.time() - start}")