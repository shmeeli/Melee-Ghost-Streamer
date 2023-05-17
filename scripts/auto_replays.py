import obspython as obs
import os

replay_path = ""
source_name = ""
has_viewed_replays = False
time_passed = 0
current_replays = []
old_replays = []


def find_scene_item():
    source = obs.obs_frontend_get_current_scene()
    if not source:
        return False

    scene = obs.obs_scene_from_source(source)
    obs.obs_source_release(source)
    scene_item = obs.obs_scene_find_source(scene, source_name)

    if scene_item:
        return True

    return False


def add_replay(replay):
    global source_name, current_replays

    print("Adding replay")

    current_replays.append(replay)

    source = obs.obs_get_source_by_name(source_name)

    if source is not None:
        settings = obs.obs_data_create()
        source_id = obs.obs_source_get_id(source)
        if source_id == "vlc_source":
            array = obs.obs_data_array_create()
            for path in current_replays:
                item = obs.obs_data_create()
                obs.obs_data_set_string(item, "value", replay_path + "/" + path)
                obs.obs_data_array_push_back(array, item)

            obs.obs_data_set_array(settings, "playlist", array)

            obs.obs_source_update(source, settings)
            obs.obs_data_release(item)
            obs.obs_data_array_release(array)

        obs.obs_data_release(settings)
        obs.obs_source_release(source)
    else:
        print("No source set")


def script_update(settings):
    global replay_path, old_replays, source_name
    replay_path = obs.obs_data_get_string(settings, "path")
    source_name = obs.obs_data_get_string(settings, "source")

    files = os.listdir(replay_path)

    for file in files:
        if file.endswith(".mkv"):
            old_replays.append(file)


def script_description():
    return
    "When a video is made in the path below it will automatically be added to the playlist. After the playlist has been shown it will be reset."


def script_properties():
    props = obs.obs_properties_create()

    obs.obs_properties_add_path(
        props, "path", "Path", obs.OBS_PATH_DIRECTORY, None, None
    )

    p = obs.obs_properties_add_list(
        props,
        "source",
        "Media Source",
        obs.OBS_COMBO_TYPE_EDITABLE,
        obs.OBS_COMBO_FORMAT_STRING,
    )
    sources = obs.obs_enum_sources()
    if sources is not None:
        for source in sources:
            source_id = obs.obs_source_get_id(source)
            if source_id == "ffmpeg_source":
                name = obs.obs_source_get_name(source)
                obs.obs_property_list_add_string(p, name, name)
            elif source_id == "vlc_source":
                name = obs.obs_source_get_name(source)
                obs.obs_property_list_add_string(p, name, name)

    obs.source_list_release(sources)

    return props


def script_load(settings):
    obs.obs_frontend_add_event_callback(on_event)


def script_tick(seconds):
    global time_passed, old_replays, replay_path

    time_passed += seconds

    if time_passed < 1:
        return

    time_passed = 0

    paths = os.listdir(replay_path)

    # Find new files
    for file in paths:
        if file.endswith(".mkv") and file not in old_replays:
            add_replay(file)
            old_replays.append(file)


def on_event(event):
    global has_viewed_replays, current_replays, source_name, replay_path
    if event == obs.OBS_FRONTEND_EVENT_SCENE_CHANGED:
        if find_scene_item():
            has_viewed_replays = True
        elif has_viewed_replays:
            has_viewed_replays = False
            current_replays = []
