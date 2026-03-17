import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import random
import re
import pyautogui
import pyperclip

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.0


class AttendanceInputTester:
    def __init__(self, root):
        self.root = root
        self.root.title("Attendance Input Tester Pro")
        self.root.geometry("1040x760")
        self.root.minsize(920, 680)

        self.is_running = False
        self.stop_requested = False
        self.worker_thread = None

        self.build_ui()

    def build_ui(self):
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except Exception:
            pass

        style.configure("Title.TLabel", font=("Segoe UI", 15, "bold"))
        style.configure("Section.TLabelframe.Label", font=("Segoe UI", 10, "bold"))
        style.configure("Action.TButton", padding=(10, 6))
        style.configure("Danger.TButton", padding=(10, 6))
        style.configure("Small.TButton", padding=(8, 4))

        main = ttk.Frame(self.root, padding=12)
        main.pack(fill="both", expand=True)

        ttk.Label(main, text="Student Card Auto Entry Tester", style="Title.TLabel").pack(anchor="w", pady=(0, 8))

        ttk.Label(
            main,
            text=(
                "Paste or generate student card values, then click Start. "
                "During the countdown, click inside your target application's input field."
            ),
            wraplength=980,
            justify="left"
        ).pack(anchor="w", pady=(0, 10))

        top_area = ttk.Frame(main)
        top_area.pack(fill="both", expand=True)

        # Left side: data
        left_frame = ttk.Frame(top_area)
        left_frame.pack(side="left", fill="both", expand=True, padx=(0, 8))

        input_frame = ttk.LabelFrame(left_frame, text="Input Values (one per line)", padding=10, style="Section.TLabelframe")
        input_frame.pack(fill="both", expand=True)

        self.input_text = tk.Text(input_frame, height=22, font=("Consolas", 11), wrap="none")
        self.input_text.pack(side="left", fill="both", expand=True)

        scroll_y = ttk.Scrollbar(input_frame, orient="vertical", command=self.input_text.yview)
        scroll_y.pack(side="right", fill="y")
        self.input_text.configure(yscrollcommand=scroll_y.set)

        # Right side: generator + settings (scrollable so all buttons stay visible)
        right_outer = ttk.Frame(top_area, width=350)
        right_outer.pack(side="right", fill="y")
        right_outer.pack_propagate(False)

        canvas = tk.Canvas(right_outer, highlightthickness=0)
        scrollbar = ttk.Scrollbar(right_outer, orient="vertical", command=canvas.yview)

        right_frame = ttk.Frame(canvas)
        right_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        canvas.create_window((0, 0), window=right_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        def _on_canvas_configure(event):
            canvas.itemconfig(canvas.find_all()[0], width=event.width)
        canvas.bind("<Configure>", _on_canvas_configure)

        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
        canvas.bind("<MouseWheel>", _on_mousewheel)

        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        gen_frame = ttk.LabelFrame(right_frame, text="Generate / Expand Values", padding=10, style="Section.TLabelframe")
        gen_frame.pack(fill="x", pady=(0, 8))

        ttk.Label(gen_frame, text="Range expression:").grid(row=0, column=0, sticky="w")
        self.range_expr_var = tk.StringVar()
        self.range_expr_entry = ttk.Entry(gen_frame, textvariable=self.range_expr_var)
        self.range_expr_entry.grid(row=1, column=0, columnspan=3, sticky="ew", pady=(2, 8))

        examples = (
            "Examples:\n"
            "1-550\n"
            "001-550\n"
            "stu001-stu1000"
        )
        ttk.Label(gen_frame, text=examples, justify="left", foreground="#444").grid(
            row=2, column=0, columnspan=3, sticky="w", pady=(0, 8)
        )

        ttk.Label(gen_frame, text="Or manual generator:").grid(row=3, column=0, columnspan=3, sticky="w", pady=(0, 4))

        ttk.Label(gen_frame, text="Prefix").grid(row=4, column=0, sticky="w")
        ttk.Label(gen_frame, text="From").grid(row=4, column=1, sticky="w")
        ttk.Label(gen_frame, text="To").grid(row=4, column=2, sticky="w")

        self.prefix_var = tk.StringVar()
        self.from_var = tk.StringVar(value="1")
        self.to_var = tk.StringVar(value="100")

        ttk.Entry(gen_frame, textvariable=self.prefix_var, width=10).grid(row=5, column=0, sticky="ew", padx=(0, 4))
        ttk.Entry(gen_frame, textvariable=self.from_var, width=10).grid(row=5, column=1, sticky="ew", padx=4)
        ttk.Entry(gen_frame, textvariable=self.to_var, width=10).grid(row=5, column=2, sticky="ew", padx=(4, 0))

        ttk.Label(gen_frame, text="Pad width").grid(row=6, column=0, sticky="w", pady=(8, 0))
        self.pad_width_var = tk.StringVar(value="0")
        ttk.Entry(gen_frame, textvariable=self.pad_width_var, width=10).grid(row=7, column=0, sticky="ew", padx=(0, 4), pady=(2, 8))

        self.shuffle_var = tk.BooleanVar(value=False)
        self.append_var = tk.BooleanVar(value=False)
        self.unique_var = tk.BooleanVar(value=False)

        ttk.Checkbutton(gen_frame, text="Shuffle generated values", variable=self.shuffle_var).grid(
            row=8, column=0, columnspan=3, sticky="w"
        )
        ttk.Checkbutton(gen_frame, text="Append to existing input", variable=self.append_var).grid(
            row=9, column=0, columnspan=3, sticky="w"
        )
        ttk.Checkbutton(gen_frame, text="Remove duplicates after generate", variable=self.unique_var).grid(
            row=10, column=0, columnspan=3, sticky="w", pady=(0, 8)
        )

        btn_gen_row = ttk.Frame(gen_frame)
        btn_gen_row.grid(row=11, column=0, columnspan=3, sticky="ew", pady=(4, 0))

        ttk.Button(btn_gen_row, text="Generate", command=self.generate_values, style="Small.TButton").pack(side="left", fill="x", expand=True, padx=(0, 4))
        ttk.Button(btn_gen_row, text="Shuffle Existing", command=self.shuffle_existing_values, style="Small.TButton").pack(side="left", fill="x", expand=True, padx=4)
        ttk.Button(btn_gen_row, text="Clear", command=self.clear_input, style="Small.TButton").pack(side="left", fill="x", expand=True, padx=(4, 0))

        gen_frame.columnconfigure(0, weight=1)
        gen_frame.columnconfigure(1, weight=1)
        gen_frame.columnconfigure(2, weight=1)

        control_frame = ttk.LabelFrame(right_frame, text="Auto Entry Settings", padding=10, style="Section.TLabelframe")
        control_frame.pack(fill="x", pady=(0, 8))

        ttk.Label(control_frame, text="Start countdown (sec)").grid(row=0, column=0, sticky="w")
        ttk.Label(control_frame, text="Between entries (sec)").grid(row=0, column=1, sticky="w")

        self.start_delay_var = tk.StringVar(value="3")
        self.entry_delay_var = tk.StringVar(value="0.25")

        ttk.Entry(control_frame, textvariable=self.start_delay_var).grid(row=1, column=0, sticky="ew", padx=(0, 4), pady=(2, 8))
        ttk.Entry(control_frame, textvariable=self.entry_delay_var).grid(row=1, column=1, sticky="ew", padx=(4, 0), pady=(2, 8))

        ttk.Label(control_frame, text="Delay after Enter").grid(row=2, column=0, sticky="w")
        ttk.Label(control_frame, text="Char interval (type mode)").grid(row=2, column=1, sticky="w")

        self.enter_delay_var = tk.StringVar(value="0.05")
        self.char_interval_var = tk.StringVar(value="0.01")

        ttk.Entry(control_frame, textvariable=self.enter_delay_var).grid(row=3, column=0, sticky="ew", padx=(0, 4), pady=(2, 8))
        ttk.Entry(control_frame, textvariable=self.char_interval_var).grid(row=3, column=1, sticky="ew", padx=(4, 0), pady=(2, 8))

        self.press_enter_var = tk.BooleanVar(value=True)
        self.skip_blank_var = tk.BooleanVar(value=True)
        self.select_all_var = tk.BooleanVar(value=False)

        ttk.Checkbutton(control_frame, text="Press Enter after each value", variable=self.press_enter_var).grid(
            row=4, column=0, columnspan=2, sticky="w"
        )
        ttk.Checkbutton(control_frame, text="Skip blank lines", variable=self.skip_blank_var).grid(
            row=5, column=0, columnspan=2, sticky="w"
        )
        ttk.Checkbutton(control_frame, text="Ctrl+A before insert", variable=self.select_all_var).grid(
            row=6, column=0, columnspan=2, sticky="w", pady=(0, 8)
        )

        ttk.Label(control_frame, text="Insert mode").grid(row=7, column=0, sticky="w")
        self.mode_var = tk.StringVar(value="paste")

        mode_row = ttk.Frame(control_frame)
        mode_row.grid(row=8, column=0, columnspan=2, sticky="w")
        ttk.Radiobutton(mode_row, text="Paste", variable=self.mode_var, value="paste").pack(side="left", padx=(0, 10))
        ttk.Radiobutton(mode_row, text="Type", variable=self.mode_var, value="type").pack(side="left")

        control_frame.columnconfigure(0, weight=1)
        control_frame.columnconfigure(1, weight=1)

        action_frame = ttk.LabelFrame(right_frame, text="Actions", padding=10, style="Section.TLabelframe")
        action_frame.pack(fill="x", pady=(0, 8))

        self.start_button = ttk.Button(action_frame, text="Start", command=self.start_process, style="Action.TButton")
        self.start_button.pack(fill="x", pady=(0, 6))

        self.stop_button = ttk.Button(action_frame, text="Stop", command=self.stop_process, state="disabled", style="Danger.TButton")
        self.stop_button.pack(fill="x", pady=(0, 6))

        ttk.Button(action_frame, text="Load Sample", command=self.load_sample, style="Action.TButton").pack(fill="x")

        progress_frame = ttk.LabelFrame(right_frame, text="Progress", padding=10, style="Section.TLabelframe")
        progress_frame.pack(fill="x", pady=(0, 8))

        self.status_var = tk.StringVar(value="Ready.")
        ttk.Label(progress_frame, textvariable=self.status_var, wraplength=290, justify="left").pack(anchor="w", pady=(0, 8))

        self.progress = ttk.Progressbar(progress_frame, orient="horizontal", mode="determinate")
        self.progress.pack(fill="x", pady=(0, 6))

        self.count_var = tk.StringVar(value="Processed: 0 / 0")
        ttk.Label(progress_frame, textvariable=self.count_var).pack(anchor="w")

        self.total_items_var = tk.StringVar(value="Total input values: 0")
        ttk.Label(progress_frame, textvariable=self.total_items_var).pack(anchor="w", pady=(6, 0))

        notes_frame = ttk.LabelFrame(main, text="Notes", padding=10, style="Section.TLabelframe")
        notes_frame.pack(fill="x", pady=(8, 0))

        ttk.Label(
            notes_frame,
            text=(
                "• Click Start, then click into your target input field before the countdown ends.\n"
                "• Paste mode is usually faster and more reliable.\n"
                "• Move mouse to the top-left corner to trigger PyAutoGUI fail-safe.\n"
                "• Use small delays first. If your app misses records, increase the delay slightly."
            ),
            justify="left"
        ).pack(anchor="w")

        self.input_text.bind("<KeyRelease>", lambda e: self.update_total_label())

    def update_total_label(self):
        values = self.get_lines()
        self.total_items_var.set(f"Total input values: {len(values)}")

    def clear_input(self):
        if self.is_running:
            return
        self.input_text.delete("1.0", tk.END)
        self.update_total_label()
        self.status_var.set("Input cleared.")

    def load_sample(self):
        if self.is_running:
            return
        sample = "\n".join([
            "stu001",
            "stu002",
            "stu003",
            "stu004",
            "stu005",
        ])
        self.input_text.delete("1.0", tk.END)
        self.input_text.insert("1.0", sample)
        self.update_total_label()
        self.status_var.set("Sample loaded.")

    def get_lines(self):
        raw = self.input_text.get("1.0", tk.END).splitlines()
        if self.skip_blank_var.get():
            return [line.strip() for line in raw if line.strip()]
        return [line.rstrip("\n") for line in raw]

    def set_lines(self, items, append=False):
        text = "\n".join(items)
        if append:
            existing = self.input_text.get("1.0", tk.END).strip()
            if existing:
                self.input_text.insert(tk.END, "\n" + text)
            else:
                self.input_text.insert("1.0", text)
        else:
            self.input_text.delete("1.0", tk.END)
            self.input_text.insert("1.0", text)

        self.update_total_label()

    def remove_duplicates_preserve_order(self, items):
        seen = set()
        result = []
        for item in items:
            if item not in seen:
                seen.add(item)
                result.append(item)
        return result

    def parse_smart_range_expression(self, expr):
        expr = expr.strip()
        if not expr:
            return None

        # numeric range only: 1-550 or 001-550
        m_num = re.fullmatch(r'(\d+)\s*-\s*(\d+)', expr)
        if m_num:
            start_s, end_s = m_num.group(1), m_num.group(2)
            start_n, end_n = int(start_s), int(end_s)
            width = max(len(start_s), len(end_s)) if (start_s.startswith("0") or end_s.startswith("0")) else 0
            return self.build_values("", start_n, end_n, width)

        # prefixed range: stu001-stu1000
        m_pref = re.fullmatch(r'([^\d\s]+)(\d+)\s*-\s*([^\d\s]+)(\d+)', expr)
        if m_pref:
            prefix1, start_s, prefix2, end_s = m_pref.groups()
            if prefix1 != prefix2:
                raise ValueError("Prefix on both sides must match, for example: stu001-stu1000")
            start_n, end_n = int(start_s), int(end_s)
            width = max(len(start_s), len(end_s))
            return self.build_values(prefix1, start_n, end_n, width)

        raise ValueError("Invalid range expression. Use formats like 1-550 or stu001-stu1000")

    def build_values(self, prefix, start_n, end_n, pad_width=0):
        if start_n > end_n:
            raise ValueError("'From' cannot be greater than 'To'")

        items = []
        for n in range(start_n, end_n + 1):
            if pad_width > 0:
                items.append(f"{prefix}{str(n).zfill(pad_width)}")
            else:
                items.append(f"{prefix}{n}")
        return items

    def generate_values(self):
        if self.is_running:
            return

        expr = self.range_expr_var.get().strip()
        append = self.append_var.get()
        items = []

        try:
            if expr:
                items = self.parse_smart_range_expression(expr)
            else:
                prefix = self.prefix_var.get().strip()
                start_n = int(self.from_var.get().strip())
                end_n = int(self.to_var.get().strip())
                pad_width = int(self.pad_width_var.get().strip() or "0")
                if pad_width < 0:
                    raise ValueError("Pad width cannot be negative")
                items = self.build_values(prefix, start_n, end_n, pad_width)

            if self.shuffle_var.get():
                random.shuffle(items)

            if append:
                existing = self.get_lines()
                items = existing + items

            if self.unique_var.get():
                items = self.remove_duplicates_preserve_order(items)

            self.set_lines(items, append=False)
            self.status_var.set(f"Generated {len(items)} values.")

        except Exception as e:
            messagebox.showerror("Generate Error", str(e))

    def shuffle_existing_values(self):
        if self.is_running:
            return

        items = self.get_lines()
        if not items:
            messagebox.showwarning("No Data", "There are no input values to shuffle.")
            return

        random.shuffle(items)
        self.set_lines(items, append=False)
        self.status_var.set("Existing values shuffled.")

    def validate_inputs(self):
        lines = self.get_lines()
        if not lines:
            messagebox.showwarning("No Data", "Please enter or generate at least one value.")
            return None

        try:
            start_delay = float(self.start_delay_var.get().strip())
            entry_delay = float(self.entry_delay_var.get().strip())
            enter_delay = float(self.enter_delay_var.get().strip())
            char_interval = float(self.char_interval_var.get().strip())
        except ValueError:
            messagebox.showerror("Invalid Input", "All delay fields must be numeric.")
            return None

        if min(start_delay, entry_delay, enter_delay, char_interval) < 0:
            messagebox.showerror("Invalid Input", "Delay values cannot be negative.")
            return None

        return {
            "lines": lines,
            "start_delay": start_delay,
            "entry_delay": entry_delay,
            "enter_delay": enter_delay,
            "char_interval": char_interval,
            "press_enter": self.press_enter_var.get(),
            "mode": self.mode_var.get(),
            "select_all": self.select_all_var.get(),
        }

    def start_process(self):
        if self.is_running:
            return

        config = self.validate_inputs()
        if not config:
            return

        self.is_running = True
        self.stop_requested = False
        self.start_button.config(state="disabled")
        self.stop_button.config(state="normal")
        self.progress["maximum"] = len(config["lines"])
        self.progress["value"] = 0
        self.count_var.set(f"Processed: 0 / {len(config['lines'])}")
        self.status_var.set("Preparing to start...")

        self.worker_thread = threading.Thread(target=self.run_process, args=(config,), daemon=True)
        self.worker_thread.start()

    def stop_process(self):
        self.stop_requested = True
        self.status_var.set("Stop requested...")

    def finish_process_ui(self, message):
        self.is_running = False
        self.start_button.config(state="normal")
        self.stop_button.config(state="disabled")
        self.status_var.set(message)

    def update_progress_ui(self, current, total, current_value):
        self.progress["value"] = current
        self.count_var.set(f"Processed: {current} / {total}")
        self.status_var.set(f"Inserting: {current_value}")

    def run_process(self, config):
        lines = config["lines"]
        total = len(lines)

        try:
            countdown = config["start_delay"]
            while countdown > 0 and not self.stop_requested:
                self.root.after(
                    0,
                    lambda c=countdown: self.status_var.set(
                        f"Starting in {c:.1f} sec... click into the target field now."
                    )
                )
                time.sleep(0.1)
                countdown = round(countdown - 0.1, 1)

            if self.stop_requested:
                self.root.after(0, lambda: self.finish_process_ui("Stopped before start."))
                return

            self.root.after(0, lambda: self.status_var.set("Started. Keep focus on the target input."))

            for index, value in enumerate(lines, start=1):
                if self.stop_requested:
                    self.root.after(0, lambda: self.finish_process_ui("Stopped by user."))
                    return

                if config["select_all"]:
                    pyautogui.hotkey("ctrl", "a")
                    time.sleep(0.02)

                if config["mode"] == "paste":
                    pyperclip.copy(value)
                    pyautogui.hotkey("ctrl", "v")
                else:
                    pyautogui.write(value, interval=config["char_interval"])

                if config["press_enter"]:
                    time.sleep(config["enter_delay"])
                    pyautogui.press("enter")

                self.root.after(
                    0,
                    lambda i=index, t=total, v=value: self.update_progress_ui(i, t, v)
                )

                time.sleep(config["entry_delay"])

            self.root.after(0, lambda: self.finish_process_ui("Completed successfully."))

        except pyautogui.FailSafeException:
            self.root.after(
                0,
                lambda: self.finish_process_ui(
                    "Fail-safe triggered. Mouse moved to top-left corner."
                )
            )
        except Exception as e:
            self.root.after(0, lambda: self.finish_process_ui(f"Error: {e}"))


def main():
    root = tk.Tk()
    app = AttendanceInputTester(root)
    root.mainloop()


if __name__ == "__main__":
    main()